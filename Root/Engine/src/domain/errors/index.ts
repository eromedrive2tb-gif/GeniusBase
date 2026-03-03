/**
 * Domain: Custom Errors
 * Root/Engine/src/domain/errors/index.ts
 */

export class DomainError extends Error {
    constructor(
        public message: string,
        public code: string = 'INTERNAL_ERROR',
        public statusCode: number = 500
    ) {
        super(message)
        this.name = 'DomainError'
    }
}

export class BadRequestError extends DomainError {
    constructor(message: string, code: string = 'BAD_REQUEST') {
        super(message, code, 400)
    }
}

export class UnauthorizedError extends DomainError {
    constructor(message: string, code: string = 'UNAUTHORIZED') {
        super(message, code, 401)
    }
}

export class ForbiddenError extends DomainError {
    constructor(message: string, code: string = 'FORBIDDEN') {
        super(message, code, 403)
    }
}

export class NotFoundError extends DomainError {
    constructor(message: string, code: string = 'NOT_FOUND') {
        super(message, code, 404)
    }
}

export class UnprocessableEntityError extends DomainError {
    constructor(message: string, code: string = 'UNPROCESSABLE_ENTITY') {
        super(message, code, 422)
    }
}

export class ConflictError extends DomainError {
    constructor(message: string, code: string = 'CONFLICT') {
        super(message, code, 409)
    }
}

export class RateLimitError extends DomainError {
    constructor(message: string, code: string = 'RATE_LIMIT_EXCEEDED') {
        super(message, code, 429)
    }
}
