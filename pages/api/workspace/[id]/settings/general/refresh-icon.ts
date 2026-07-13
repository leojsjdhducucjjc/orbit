import type { NextApiRequest, NextApiResponse } from 'next';
import * as noblox from 'noblox.js';
import prisma from '@/utils/database';
import { logAudit } from '@/utils/logs';
import { AuthenticatedRequest, withAuth } from '@/lib/withAuth';
import { validateCsrf } from '@/utils/csrf';

type Data = {
	success: boolean;
	error?: string;
	groupThumbnail?: string;
};

export default withAuth(handler);

async function handler(req: AuthenticatedRequest, res: NextApiResponse<Data>) {
	if (req.method !== 'POST') {
		return res.status(405).json({ success: false, error: 'Method not allowed' });
	}
	if (!validateCsrf(req, res)) {
		return res.status(403).json({ success: false, error: 'CSRF validation failed. Invalid origin or referer.' });
	}
	const workspaceId = parseInt(req.query.id as string, 10);
	if (Number.isNaN(workspaceId)) {
		return res.status(400).json({ success: false, error: 'Invalid workspace ID' });
	}

	const user = await prisma.user.findUnique({
		where: { userid: req.auth.userId },
		include: {
			roles: { where: { workspaceGroupId: workspaceId } },
			workspaceMemberships: { where: { workspaceGroupId: workspaceId } },
		},
	});
	const hasWorkspaceAccess =
		user?.workspaceMemberships.some((membership) => membership.isAdmin) ||
		user?.roles.some(
			(role) =>
				role.isOwnerRole ||
				role.permissions.includes('admin') ||
				role.permissions.includes('workspace_customisation'),
		);

	let isRobloxOwner = false;
	if (!hasWorkspaceAccess) {
		const group = await fetch(`https://groups.roblox.com/v1/groups/${workspaceId}`)
			.then(async (response) =>
				response.ok
					? ((await response.json()) as { owner?: { userId?: number } })
					: null,
			)
			.catch(() => null);
		isRobloxOwner = group?.owner?.userId === Number(req.auth.userId);
		if (isRobloxOwner) {
			await prisma.workspaceMember.upsert({
				where: {
					workspaceGroupId_userId: {
						workspaceGroupId: workspaceId,
						userId: req.auth.userId,
					},
				},
				update: { isAdmin: true },
				create: {
					workspaceGroupId: workspaceId,
					userId: req.auth.userId,
					joinDate: new Date(),
					isAdmin: true,
				},
			});
		}
	}

	if (!hasWorkspaceAccess && !isRobloxOwner) {
		return res.status(403).json({ success: false, error: 'Workspace customisation access required.' });
	}

	let logo: string;
	try {
		logo = await noblox.getLogo(workspaceId, '420x420');
	} catch (e) {
		console.error('[refresh-icon] noblox.getLogo failed:', e);
		return res.status(502).json({
			success: false,
			error: 'Could not fetch the group icon from Roblox. Try again in a moment.',
		});
	}
	if (!logo) {
		return res.status(502).json({
			success: false,
			error: 'Roblox did not return an icon for this group.',
		});
	}

	try {
		const before = await prisma.workspace.findUnique({
			where: { groupId: workspaceId },
			select: { groupLogo: true },
		});

		await prisma.workspace.update({
			where: { groupId: workspaceId },
			data: { groupLogo: logo },
		});

		try {
			await logAudit(
				workspaceId,
				(req as NextApiRequest & { session?: { userid?: number } }).session?.userid ?? null,
				'settings.general.refresh_group_logo',
				'workspace',
				{ before: before?.groupLogo ?? null, after: logo }
			);
		} catch {}

		return res.status(200).json({ success: true, groupThumbnail: logo });
	} catch (e) {
		console.error('[refresh-icon] database update failed:', e);
		return res.status(500).json({ success: false, error: 'Failed to save workspace icon' });
	}
}
