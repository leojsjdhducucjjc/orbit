import type { NextApiResponse } from "next";
import { AuthenticatedRequest } from "@/lib/withAuth";
import { withPermissionCheck } from "@/utils/permissionsManager";
import prisma from "@/utils/database";
import { getThumbnail, getUsername } from "@/utils/userinfoEngine";

export default withPermissionCheck(handler);

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const workspaceGroupId = Number.parseInt(req.query.id as string, 10);
  if (!workspaceGroupId) {
    return res.status(400).json({ success: false, error: "Invalid workspace" });
  }

  const [users, allies] = await Promise.all([
    prisma.user.findMany({
      where: {
        roles: {
          some: {
            workspaceGroupId,
            permissions: {
              has: "represent_alliance",
            },
          },
        },
      },
    }),
    prisma.ally.findMany({
      where: {
        workspaceGroupId,
      },
      include: {
        reps: true,
      },
    }),
  ]);

  const [infoUsers, infoAllies] = await Promise.all([
    Promise.all(
      users.map(async (user: any) => ({
        ...user,
        userid: Number(user.userid),
        thumbnail: getThumbnail(user.userid),
      })),
    ),
    Promise.all(
      allies.map(async (ally: any) => {
        const reps = await Promise.all(
          ally.reps.map(async (rep: any) => ({
            ...rep,
            userid: Number(rep.userid),
            username: await getUsername(rep.userid),
            thumbnail: getThumbnail(rep.userid),
          })),
        );

        return {
          ...ally,
          reps,
        };
      }),
    ),
  ]);

  return res.status(200).json({
    success: true,
    users: infoUsers,
    allies: infoAllies,
  });
}
