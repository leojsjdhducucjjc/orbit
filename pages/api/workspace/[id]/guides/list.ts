import type { NextApiResponse } from "next";
import prisma from "@/utils/database";
import type { documentFolder } from "@prisma/client";
import { AuthenticatedRequest } from "@/lib/withAuth";
import { withPermissionCheck } from "@/utils/permissionsManager";

function buildDocumentAccessFilter(
  userRoleIds: string[],
  userDepartmentIds: string[],
) {
  return {
    OR: [
      ...(userRoleIds.length > 0
        ? [{ roles: { some: { id: { in: userRoleIds } } } }]
        : []),
      ...(userDepartmentIds.length > 0
        ? [{ departments: { some: { id: { in: userDepartmentIds } } } }]
        : []),
      { roles: { none: {} }, departments: { none: {} } },
    ],
  };
}

async function buildBreadcrumbs(folderId: string, workspaceGroupId: number) {
  const path = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const folder: Pick<documentFolder, "id" | "name" | "parentId" | "icon"> | null =
      await prisma.documentFolder.findFirst({
      where: { id: currentId, workspaceGroupId },
      select: { id: true, name: true, parentId: true, icon: true },
    });
    if (!folder) break;
    path.unshift(folder);
    currentId = folder.parentId;
  }

  return path;
}

export default withPermissionCheck(handler);

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const workspaceGroupId = Number.parseInt(req.query.id as string, 10);
  const currentFolderId =
    typeof req.query.folder === "string" && req.query.folder
      ? req.query.folder
      : null;

  const user = await prisma.user.findFirst({
    where: { userid: req.auth.userId },
    include: {
      roles: { where: { workspaceGroupId } },
      workspaceMemberships: {
        where: { workspaceGroupId },
        include: { departmentMembers: true },
      },
    },
  });

  if (!user) return res.status(401).json({ success: false, error: "Unauthorized" });

  const config = await prisma.config.findFirst({
    where: { workspaceGroupId, key: "guides" },
  });

  let guidesEnabled = false;
  if (config?.value) {
    let val = config.value;
    if (typeof val === "string") {
      try {
        val = JSON.parse(val);
      } catch {
        val = {};
      }
    }
    guidesEnabled =
      typeof val === "object" && val !== null && "enabled" in val
        ? (val as { enabled?: boolean }).enabled ?? false
        : false;
  }

  if (!guidesEnabled) {
    return res.status(404).json({ success: false, error: "Guides disabled" });
  }

  const membership = user.workspaceMemberships?.[0];
  const isAdmin = membership?.isAdmin || false;
  const userRoleIds = (user.roles || []).map((r: any) => r.id);
  const userDepartmentIds = (membership?.departmentMembers || []).map(
    (d: any) => d.departmentId,
  );

  const canCreate =
    isAdmin ||
    (user.roles || []).some((r: any) => (r.permissions || []).includes("create_docs"));
  const canEdit =
    isAdmin ||
    (user.roles || []).some((r: any) => (r.permissions || []).includes("edit_docs"));
  const canDelete =
    isAdmin ||
    (user.roles || []).some((r: any) => (r.permissions || []).includes("delete_docs"));
  const canManage = canCreate || canEdit || canDelete;

  if (currentFolderId) {
    const currentFolder = await prisma.documentFolder.findFirst({
      where: { id: currentFolderId, workspaceGroupId },
    });
    if (!currentFolder) {
      return res.status(404).json({ success: false, error: "Folder not found" });
    }
  }

  const baseWhere = {
    workspaceGroupId,
    requiresAcknowledgment: false,
  };
  const docAccessFilter = buildDocumentAccessFilter(
    userRoleIds,
    userDepartmentIds,
  );

  const [documents, folders, breadcrumbs] = await Promise.all([
    prisma.document.findMany({
      where: canManage
        ? { ...baseWhere, folderId: currentFolderId }
        : {
            ...baseWhere,
            folderId: currentFolderId,
            ...docAccessFilter,
          },
      include: {
        owner: { select: { username: true, picture: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.documentFolder.findMany({
      where: canManage
        ? { workspaceGroupId, parentId: currentFolderId }
        : {
            workspaceGroupId,
            parentId: currentFolderId,
            OR: [
              { documents: { some: { ...baseWhere, ...docAccessFilter } } },
              {
                children: {
                  some: { documents: { some: { ...baseWhere, ...docAccessFilter } } },
                },
              },
            ],
          },
      include: {
        _count: {
          select: { documents: true, children: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    currentFolderId ? buildBreadcrumbs(currentFolderId, workspaceGroupId) : [],
  ]);

  return res.status(200).json({
    success: true,
    documents: JSON.parse(
      JSON.stringify(documents, (_k, v) => (typeof v === "bigint" ? v.toString() : v)),
    ),
    folders,
    breadcrumbs,
    currentFolderId,
    canCreate,
    canEdit,
    canDelete,
  });
}
