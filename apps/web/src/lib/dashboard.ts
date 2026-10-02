import { me } from "@/lib/api/auth";
import { getSessionSnapshot } from "@/lib/auth/auth-service";
import type {
  ActivityItem,
  DashboardData,
  DashboardSummary,
  Organization,
  Project,
  TaskStatusCounts,
  UnavailableNotice,
} from "@/types/dashboard";

type ParsedIdentity = {
  name: string;
  firstName: string;
  lastName: string;
  initials: string;
};

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function deriveIdentity(displayName: string | undefined, email: string | undefined): ParsedIdentity {
  const cleanedName = displayName?.trim() ?? "";
  const fallbackEmail = email?.trim() ?? "";

  if (cleanedName) {
    const parts = cleanedName.split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      const firstName = titleCase(parts[0] ?? cleanedName);
      return {
        name: firstName,
        firstName,
        lastName: "",
        initials: firstName.slice(0, 2).toUpperCase(),
      };
    }

    const firstName = titleCase(parts[0] ?? cleanedName);
    const lastName = titleCase(parts.slice(1).join(" "));

    return {
      name: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      initials: `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase(),
    };
  }

  const emailLocalPart = fallbackEmail.split("@")[0]?.trim() ?? "";

  if (emailLocalPart) {
    const parts = emailLocalPart.split(/[._-]+/).filter(Boolean);
    const firstName = titleCase(parts[0] ?? emailLocalPart);
    const lastName = parts.length > 1 ? titleCase(parts.slice(1).join(" ")) : "";

    return {
      name: lastName ? `${firstName} ${lastName}` : firstName,
      firstName,
      lastName,
      initials: `${firstName[0] ?? ""}${lastName[0] ?? firstName[1] ?? ""}`.toUpperCase(),
    };
  }

  return {
    name: "TeamForge User",
    firstName: "TeamForge",
    lastName: "User",
    initials: "TF",
  };
}

function unavailableNotice(title: string, message: string): UnavailableNotice {
  return {
    kind: "unavailable",
    title,
    message,
  };
}

function unavailableOrganization(): Organization {
  return {
    id: "unavailable",
    name: "Organization unavailable",
    slug: "",
    state: "unavailable",
    message: "No organization read endpoint exists yet.",
  };
}

function unavailableSummary(): DashboardSummary {
  return {
    state: "unavailable",
    message: "No summary aggregate endpoint exists yet.",
    activeProjects: 0,
    atRisk: 0,
    openTasks: 0,
    dueThisWeek: 0,
  };
}

function unavailableTaskStatus(): TaskStatusCounts {
  return {
    state: "unavailable",
    message: "No task status aggregate endpoint exists yet.",
    backlog: 0,
    inProgress: 0,
    review: 0,
    done: 0,
  };
}

function unavailableProjects(): Project[] {
  return [
    unavailableNotice(
      "Projects unavailable",
      "No project list endpoint exists yet, so this section cannot load live project data.",
    ),
  ];
}

function unavailableActivities(): ActivityItem[] {
  return [
    unavailableNotice(
      "Activity unavailable",
      "No activity history endpoint exists yet, so this section cannot load live activity data.",
    ),
  ];
}

export async function getDashboardData(): Promise<DashboardData> {
  const session = getSessionSnapshot();

  if (!session?.accessToken) {
    throw new Error("No active session is available.");
  }

  await me({
    Authorization: `Bearer ${session.accessToken}`,
  });

  const identity = deriveIdentity(session.user.display_name, session.user.email);

  return {
    organization: unavailableOrganization(),
    user: {
      id: session.user.id,
      name: identity.name,
      firstName: identity.firstName,
      lastName: identity.lastName,
      initials: identity.initials,
      email: session.user.email,
    },
    summary: unavailableSummary(),
    taskStatus: unavailableTaskStatus(),
    activities: unavailableActivities(),
    projects: unavailableProjects(),
  };
}