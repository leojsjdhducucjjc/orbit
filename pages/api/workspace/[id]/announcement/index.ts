import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { AuthenticatedRequest, withAuth } from "@/lib/withAuth";
import packageinfo from '@/package.json'

const DEFAULT_ANNOUNCEMENT_AUTHOR = "leojsjdhducucjjc";
const DEFAULT_ANNOUNCEMENT_ICON = "https://github.com/leojsjdhducucjjc.png";

type Data = {
  success: boolean;
  error?: string;
  announcement?: any;
  canEdit?: boolean;
};

async function handler(req: AuthenticatedRequest, res: NextApiResponse<Data>) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const workspaceId = parseInt(req.query.id as string);
  const userId = req.auth.userId;

  if (!userId || !workspaceId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  try {
    const currentUser = await prisma.user.findFirst({
      where: {
        userid: BigInt(userId),
      },
      include: {
        roles: {
          where: {
            workspaceGroupId: workspaceId,
          },
        },
        workspaceMemberships: {
          where: {
            workspaceGroupId: workspaceId,
          },
        },
      },
    });

    if (!currentUser) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const membership = currentUser.workspaceMemberships[0];
    const isAdmin = membership?.isAdmin || false;
    const userRole = currentUser.roles[0];
    const canEdit =
      isAdmin ||
      (userRole?.permissions?.includes("edit_sticky_post") ?? false);

    const announcement = await prisma.stickyAnnouncement.findUnique({
      where: {
        workspaceGroupId: workspaceId,
      },
    });

    const defaultAnnouncement = {
      title: DEFAULT_ANNOUNCEMENT_AUTHOR,
      subtitle: `Update: v${packageinfo.version} is now live!`,
      sections: [
        {
          title: "Workspace pages open faster",
          content:
            "Docs, Sessions, Settings, Alliances, Staff, and the workspace dashboard now load as fast static shells instead of waiting on server-side permission and database checks before the page appears.",
        },
        {
          title: "Less waiting between clicks",
          content:
            "Navigation should feel much snappier across the app. The heavier workspace data now loads after the screen opens, while protected APIs still enforce access rules.",
        },
        {
          title: "Faster Staff and Settings data",
          content:
            "Staff role lookups are cached, and Settings only loads the large permissions payload when you actually open the Permissions section.",
        },
        {
          title: "Cleaner deployment path",
          content:
            "Vercel builds no longer require a database URL just to compile, and the app uses the faster Turbopack build path cleanly.",
        },
      ],
      editorUsername: DEFAULT_ANNOUNCEMENT_AUTHOR,
      editorPicture: DEFAULT_ANNOUNCEMENT_ICON,
      isDefault: true,
    };

    return res.status(200).json({
      success: true,
      announcement: announcement
        ? {
            ...announcement,
            editorId: announcement.editorId ? announcement.editorId.toString() : null,
            sections:
              typeof announcement.sections === "string"
                ? JSON.parse(announcement.sections)
                : announcement.sections,
            isDefault: false,
          }
        : defaultAnnouncement,
      canEdit,
    });
  } catch (error) {
    console.error("Error fetching announcement:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch announcement",
    });
  }
}

export default withAuth(handler);
