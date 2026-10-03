import { randomUUID } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pool } from '@teamforge/db';

const mocks = vi.hoisted(() => ({
  currentUserId: '7e120d5a-dfa3-4092-ac11-7c4c8997a6ff',
}));

vi.mock('../auth/middleware.js', () => ({
  authMiddleware: (
    req: { user?: { sub: string; sid: string } },
    _res: unknown,
    next: () => void,
  ) => {
    req.user = {
      sub: mocks.currentUserId,
      sid: 'test-session',
    };
    next();
  },
}));

import organizationListRouter from './list.js';
import teamListRouter from '../teams/list.js';
import projectListRouter from '../projects/list.js';

const app = express();
app.use(express.json());
app.use(organizationListRouter);
app.use(teamListRouter);
app.use(projectListRouter);

const defaultActorId = '7e120d5a-dfa3-4092-ac11-7c4c8997a6ff';

async function cleanupRows(args: {
  projectIds?: string[];
  teamIds?: string[];
  orgIds?: string[];
  userIds?: string[];
}) {
  const { projectIds = [], teamIds = [], orgIds = [], userIds = [] } = args;

  if (projectIds.length > 0) {
    await pool.query('DELETE FROM projects WHERE id = ANY($1::uuid[])', [projectIds]);
  }

  if (teamIds.length > 0) {
    await pool.query('DELETE FROM teams WHERE id = ANY($1::uuid[])', [teamIds]);
  }

  if (orgIds.length > 0) {
    await pool.query('DELETE FROM memberships WHERE org_id = ANY($1::uuid[])', [orgIds]);
    await pool.query('DELETE FROM organizations WHERE id = ANY($1::uuid[])', [orgIds]);
  }

  if (userIds.length > 0) {
    await pool.query('DELETE FROM memberships WHERE user_id = ANY($1::uuid[])', [userIds]);
    await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [userIds]);
  }
}

async function seedUser(userId: string, email: string) {
  await pool.query(
    `
    INSERT INTO users (id, email, password_hash, display_name)
    VALUES ($1, $2, 'test-hash', $3)
    `,
    [userId, email, `User ${email}`],
  );
}

async function seedOrganization(orgId: string, name: string, slug: string, ownerId: string) {
  await pool.query(
    `
    INSERT INTO organizations (id, name, slug, owner_id)
    VALUES ($1, $2, $3, $4)
    `,
    [orgId, name, slug, ownerId],
  );
}

async function seedMembership(
  userId: string,
  orgId: string,
  role: 'member' | 'team_lead' | 'org_admin' | 'org_owner' = 'member',
) {
  await pool.query(
    `
    INSERT INTO memberships (user_id, org_id, role)
    VALUES ($1, $2, $3)
    `,
    [userId, orgId, role],
  );
}

async function seedTeam(teamId: string, orgId: string, name: string) {
  await pool.query(
    `
    INSERT INTO teams (id, org_id, name)
    VALUES ($1, $2, $3)
    `,
    [teamId, orgId, name],
  );
}

async function seedProject(projectId: string, teamId: string, name: string) {
  await pool.query(
    `
    INSERT INTO projects (id, team_id, name)
    VALUES ($1, $2, $3)
    `,
    [projectId, teamId, name],
  );
}

describe('dashboard read endpoints', () => {
  beforeEach(async () => {
    mocks.currentUserId = defaultActorId;
    const actor = await pool.query('SELECT id FROM users WHERE id = $1', [defaultActorId]);
    if (actor.rowCount === 0) {
      await seedUser(defaultActorId, 'dashboard-user@example.com');
    }
  });

  afterEach(async () => {
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['dashboard-%@example.com']);
  });

  it('lists only the organizations the signed-in user belongs to', async () => {
    const userId = defaultActorId;
    const otherUserId = randomUUID();
    const orgAId = randomUUID();
    const orgBId = randomUUID();

    mocks.currentUserId = userId;
    await seedUser(otherUserId, `dashboard-other-${Date.now()}@example.com`);
    await seedOrganization(orgAId, 'Alpha Org', `alpha-org-${Date.now()}`, userId);
    await seedOrganization(orgBId, 'Beta Org', `beta-org-${Date.now()}`, otherUserId);
    await seedMembership(userId, orgAId, 'org_owner');
    await seedMembership(otherUserId, orgBId, 'org_owner');

    try {
      const response = await request(app).get('/organizations');

      expect(response.status).toBe(200);
      expect(response.body.organizations).toHaveLength(1);
      expect(response.body.organizations[0]).toMatchObject({
        id: orgAId,
        name: 'Alpha Org',
        slug: expect.stringContaining('alpha-org-'),
        owner_id: userId,
      });
    } finally {
      await cleanupRows({ orgIds: [orgAId, orgBId], userIds: [userId, otherUserId] });
    }
  });

  it('returns ordered teams for a member organization and 200 for empty teams', async () => {
    const memberId = randomUUID();
    const orgId = randomUUID();
    const otherOrgId = randomUUID();
    const teamAlphaId = randomUUID();
    const teamBravoId = randomUUID();

    mocks.currentUserId = memberId;
    await seedUser(memberId, `dashboard-team-${Date.now()}@example.com`);
    await seedOrganization(orgId, 'Org for Teams', `org-for-teams-${Date.now()}`, memberId);
    await seedOrganization(otherOrgId, 'Other Org', `other-org-${Date.now()}`, memberId);
    await seedMembership(memberId, orgId, 'org_owner');
    await seedMembership(memberId, otherOrgId, 'org_admin');
    await seedTeam(teamBravoId, orgId, 'Bravo');
    await seedTeam(teamAlphaId, orgId, 'Alpha');

    try {
      const response = await request(app).get(`/organizations/${orgId}/teams`);

      expect(response.status).toBe(200);
      expect(response.body.teams.map((team: { name: string }) => team.name)).toEqual(['Alpha', 'Bravo']);

      const emptyResponse = await request(app).get(`/organizations/${otherOrgId}/teams`);
      expect(emptyResponse.status).toBe(200);
      expect(emptyResponse.body.teams).toEqual([]);
    } finally {
      await cleanupRows({
        teamIds: [teamAlphaId, teamBravoId],
        orgIds: [orgId, otherOrgId],
        userIds: [memberId],
      });
    }
  });

  it('returns ordered projects joined through teams and handles empty results', async () => {
    const memberId = randomUUID();
    const orgId = randomUUID();
    const otherOrgId = randomUUID();
    const teamAId = randomUUID();
    const projectBravoId = randomUUID();
    const projectAlphaId = randomUUID();
    const teamBId = randomUUID();

    mocks.currentUserId = memberId;
    await seedUser(memberId, `dashboard-project-${Date.now()}@example.com`);
    await seedOrganization(orgId, 'Org for Projects', `org-for-projects-${Date.now()}`, memberId);
    await seedOrganization(otherOrgId, 'Other Project Org', `other-project-org-${Date.now()}`, memberId);
    await seedMembership(memberId, orgId, 'org_owner');
    await seedMembership(memberId, otherOrgId, 'org_admin');
    await seedTeam(teamAId, orgId, 'Mission');
    await seedTeam(teamBId, otherOrgId, 'Other Team');
    await seedProject(projectBravoId, teamAId, 'Project Bravo');
    await seedProject(projectAlphaId, teamAId, 'Project Alpha');

    try {
      const response = await request(app).get(`/organizations/${orgId}/projects`);

      expect(response.status).toBe(200);
      expect(response.body.projects.map((project: { name: string }) => project.name)).toEqual([
        'Project Alpha',
        'Project Bravo',
      ]);

      const emptyResponse = await request(app).get(`/organizations/${otherOrgId}/projects`);
      expect(emptyResponse.status).toBe(200);
      expect(emptyResponse.body.projects).toEqual([]);
    } finally {
      await cleanupRows({
        projectIds: [projectAlphaId, projectBravoId],
        teamIds: [teamAId, teamBId],
        orgIds: [orgId, otherOrgId],
        userIds: [memberId],
      });
    }
  });

  it('keeps member data isolated across orgs even when the user belongs to more than one organization', async () => {
    const memberId = randomUUID();
    const orgAId = randomUUID();
    const orgBId = randomUUID();
    const teamAId = randomUUID();
    const teamBId = randomUUID();
    const projectAId = randomUUID();
    const projectBId = randomUUID();

    mocks.currentUserId = memberId;
    await seedUser(memberId, `dashboard-cross-org-${Date.now()}@example.com`);
    await seedOrganization(orgAId, 'Cross Org A', `cross-org-a-${Date.now()}`, memberId);
    await seedOrganization(orgBId, 'Cross Org B', `cross-org-b-${Date.now()}`, memberId);
    await seedMembership(memberId, orgAId, 'org_owner');
    await seedMembership(memberId, orgBId, 'org_admin');
    await seedTeam(teamAId, orgAId, 'Org A Team');
    await seedTeam(teamBId, orgBId, 'Org B Team');
    await seedProject(projectAId, teamAId, 'Org A Project');
    await seedProject(projectBId, teamBId, 'Org B Project');

    try {
      const teamResponse = await request(app).get(`/organizations/${orgAId}/teams`);
      expect(teamResponse.status).toBe(200);
      expect(teamResponse.body.teams).toHaveLength(1);
      expect(teamResponse.body.teams[0]).toMatchObject({ org_id: orgAId, name: 'Org A Team' });

      const projectResponse = await request(app).get(`/organizations/${orgAId}/projects`);
      expect(projectResponse.status).toBe(200);
      expect(projectResponse.body.projects).toHaveLength(1);
      expect(projectResponse.body.projects[0]).toMatchObject({ team_id: teamAId, name: 'Org A Project' });
    } finally {
      await cleanupRows({
        projectIds: [projectAId, projectBId],
        teamIds: [teamAId, teamBId],
        orgIds: [orgAId, orgBId],
        userIds: [memberId],
      });
    }
  });

  it('denies org-scoped routes to non-members and returns no org data to users with no memberships', async () => {
    const nonMemberId = randomUUID();
    const orgId = randomUUID();

    mocks.currentUserId = defaultActorId;
    await seedUser(nonMemberId, `dashboard-nonmember-${Date.now()}@example.com`);
    await seedOrganization(orgId, 'Private Org', `private-org-${Date.now()}`, nonMemberId);

    try {
      const orgListResponse = await request(app).get('/organizations');
      expect(orgListResponse.status).toBe(200);
      expect(orgListResponse.body.organizations).toEqual([]);

      const teamResponse = await request(app).get(`/organizations/${orgId}/teams`);
      expect(teamResponse.status).toBe(403);
      expect(teamResponse.body).toMatchObject({
        error: 'forbidden',
        message: 'You are not a member of this organization',
      });

      const projectResponse = await request(app).get(`/organizations/${orgId}/projects`);
      expect(projectResponse.status).toBe(403);
      expect(projectResponse.body).toMatchObject({
        error: 'forbidden',
        message: 'You are not a member of this organization',
      });
    } finally {
      await cleanupRows({ orgIds: [orgId], userIds: [nonMemberId] });
    }
  });

  it('rejects malformed org ids before querying data', async () => {
    const response = await request(app).get('/organizations/not-a-uuid/teams');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: 'invalid_request',
      message: 'Organization ID is invalid',
    });
  });
});
