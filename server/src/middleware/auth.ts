import { Request, Response, NextFunction } from 'express'
import { adminAuth } from '../config/firebaseAdmin.js'

export interface AuthenticatedRequest extends Request {
    user?: {
        uid: string
        email?: string
        displayName?: string
        photoURL?: string
    }
}

/**
 * Firebase Auth middleware — verifies the ID token from the Authorization header.
 * Adds `req.user` with the decoded token info.
 */
export const authMiddleware = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid Authorization header. Use: Bearer <idToken>' })
        return
    }

    const idToken = authHeader.split('Bearer ')[1]

    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken)
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            displayName: decodedToken.name,
            photoURL: decodedToken.picture,
        }
        next()
    } catch (error) {
        console.error('Auth verification failed:', error)
        res.status(401).json({ error: 'Invalid or expired token' })
        return
    }
}
