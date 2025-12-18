// models/TeamModel.js
const db = require("../config/database");

const TeamModel = {
    // Get all team members for a user (owner)
    getTeamMembers: async (ownerId) => {
        const [rows] = await db.execute(
            `SELECT 
                tm.member_id,
                tm.owner_id,
                tm.user_id,
                tm.role,
                tm.added_at,
                u.full_name,
                u.email,
                u.last_login
             FROM team_members tm
             JOIN users u ON tm.user_id = u.user_id
             WHERE tm.owner_id = ?
             ORDER BY tm.added_at DESC`,
            [ownerId]
        );
        return rows || [];
    },

    // Get a specific team member
    getTeamMember: async (memberId) => {
        const [rows] = await db.execute(
            `SELECT 
                tm.member_id,
                tm.owner_id,
                tm.user_id,
                tm.role,
                tm.added_at,
                u.full_name,
                u.email,
                u.last_login
             FROM team_members tm
             JOIN users u ON tm.user_id = u.user_id
             WHERE tm.member_id = ?`,
            [memberId]
        );
        return rows[0] || null;
    },

    // Add a team member
    addTeamMember: async (ownerId, userId, role = 'Assistant') => {
        try {
            const [result] = await db.execute(
                `INSERT INTO team_members (owner_id, user_id, role)
                 VALUES (?, ?, ?)`,
                [ownerId, userId, role]
            );
            return { success: true, memberId: result.insertId };
        } catch (err) {
            console.error('Error adding team member:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return { success: false, message: 'User is already a team member' };
            }
            return { success: false, message: 'Database error' };
        }
    },

    // Update team member role
    updateTeamMember: async (memberId, role) => {
        try {
            const [result] = await db.execute(
                `UPDATE team_members SET role = ? WHERE member_id = ?`,
                [role, memberId]
            );
            return { success: true, affectedRows: result.affectedRows };
        } catch (err) {
            console.error('Error updating team member:', err);
            return { success: false, message: 'Database error' };
        }
    },

    // Delete a team member
    deleteTeamMember: async (memberId) => {
        try {
            const [result] = await db.execute(
                `DELETE FROM team_members WHERE member_id = ?`,
                [memberId]
            );
            return { success: true, affectedRows: result.affectedRows };
        } catch (err) {
            console.error('Error deleting team member:', err);
            return { success: false, message: 'Database error' };
        }
    },

    // Check if user is in another user's team
    isTeamMember: async (ownerId, userId) => {
        const [rows] = await db.execute(
            `SELECT * FROM team_members WHERE owner_id = ? AND user_id = ? LIMIT 1`,
            [ownerId, userId]
        );
        return rows.length > 0;
    },

    // Update last login time
    updateLastLogin: async (userId) => {
        try {
            await db.execute(
                `UPDATE users SET last_login = NOW() WHERE user_id = ?`,
                [userId]
            );
            return true;
        } catch (err) {
            console.error('Error updating last login:', err);
            return false;
        }
    }
};

module.exports = TeamModel;
