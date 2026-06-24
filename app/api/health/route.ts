import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check
 *     description: Returns API and database connection status.
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: API and database are healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 db:
 *                   type: string
 *                   example: connected
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Database unreachable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 db:
 *                   type: string
 *                   example: unreachable
 */
export async function GET() {
    try {
        await prisma.$queryRaw`SELECT 1`
        return NextResponse.json(
            { status: 'ok', db: 'connected', timestamp: new Date().toISOString() },
            { status: 200 }
        )
    } catch (error) {
        return NextResponse.json(
            { status: 'error', db: 'unreachable' },
            { status: 500 }
        )
    }
}