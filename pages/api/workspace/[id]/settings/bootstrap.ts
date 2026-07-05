import type { NextApiResponse } from "next";
import * as noblox from "noblox.js";
import { AuthenticatedRequest } from "@/lib/withAuth";
import { withPermissionCheck } from "@/utils/permissionsManager";
import prisma from "@/utils/database";
import {
  getDisplayName,
  getThumbnail,
  getUsername,
} from "@/utils/userinfoEngine";

export default withPermissionCheck(handler, "admin");

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const workspaceGroupId = Number.parseInt(req.query.id as string, 10);
  if (!workspaceGroupId) {
    return res.status(400).json({ success: false, error: "Invalid workspace" });
  }

  const [grouproles, users, roles, departments] = await Promise.all([
    noblox.getRoles(workspaceGroupId),
    prisma.user.findMany({
      where: {
        roles: {
          some: {
            workspaceGroupId,
          },
        },
      },
      include: {
        roles: {
          where: {
            workspaceGroupId,
          },
        },
        workspaceMemberships: {
          where: {
            workspaceGroupId,
          },
        },
      },
    }),
    prisma.role.findMany({
      where: {
        workspaceGroupId,
      },
    }),
    prisma.department.findMany({
      where: {
        workspaceGroupId,
      },
    }),
  ]);

  const usersWithInfo = await Promise.all(
    users.map(async (user) => {
      const username = user.username || (await getUsername(user.userid));
      const thumbnail = user.picture || getThumbnail(user.userid);
      const displayName = user.username || (await getDisplayName(user.userid));

      return {
        ...user,
        userid: Number(user.userid),
        username,
        thumbnail,
        displayName,
        workspaceMemberships: user.workspaceMemberships?.map((m) => ({
          ...m,
          userId: Number(m.userId),
          lineManagerId: m.lineManagerId ? Number(m.lineManagerId) : null,
          joinDate: m.joinDate ? m.joinDate.toISOString() : null,
        })),
      };
    }),
  );

  return res.status(200).json({
    success: true,
    users: usersWithInfo.map((u) => ({
      ...u,
      roles: u.roles.map((r: any) => ({
        ...r,
        groupRoles: r.groupRoles.map((id: any) => id.toString()),
      })),
    })),
    roles: roles.map((r) => ({
      ...r,
      groupRoles: r.groupRoles.map((id) => id.toString()),
    })),
    departments: departments.map((d) => ({
      ...d,
      createdAt: d.createdAt ? d.createdAt.toISOString() : null,
      updatedAt: d.updatedAt ? d.updatedAt.toISOString() : null,
    })),
    grouproles,
  });
}
