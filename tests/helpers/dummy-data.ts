import { TestComment, TestPost, TestUser } from './mock-entities';
import { TestDataGenerator } from './test-utils';

/**
 * Dummy data generators for testing
 */

export interface UserData {
    name: string;
    email: string;
    age?: number;
    bio?: string;
}

export interface PostData {
    title: string;
    content: string;
    authorId: number;
}

export interface CommentData {
    text: string;
    postId: number;
    authorId: number;
}

/**
 * Generate dummy user data
 */
export function createUserData(overrides: Partial<UserData> = {}): UserData {
    return {
        name: TestDataGenerator.name(),
        email: TestDataGenerator.email(),
        age: TestDataGenerator.integer(18, 80),
        bio: TestDataGenerator.sentence(),
        ...overrides,
    };
}

/**
 * Generate dummy post data
 */
export function createPostData(authorId: number, overrides: Partial<PostData> = {}): PostData {
    return {
        title: TestDataGenerator.sentence(),
        content: Array.from({ length: 3 }, () => TestDataGenerator.sentence()).join(' '),
        authorId,
        ...overrides,
    };
}

/**
 * Generate dummy comment data
 */
export function createCommentData(postId: number, authorId: number, overrides: Partial<CommentData> = {}): CommentData {
    return {
        text: TestDataGenerator.sentence(),
        postId,
        authorId,
        ...overrides,
    };
}

/**
 * Create a complete user entity with dummy data
 */
export function createTestUser(overrides: Partial<UserData> = {}): TestUser {
    const user = new TestUser();
    const userData = createUserData(overrides);

    Object.assign(user, userData);
    return user;
}

/**
 * Create a complete post entity with dummy data
 */
export function createTestPost(authorId: number, overrides: Partial<PostData> = {}): TestPost {
    const post = new TestPost();
    const postData = createPostData(authorId, overrides);

    Object.assign(post, postData);
    return post;
}

/**
 * Create a complete comment entity with dummy data
 */
export function createTestComment(postId: number, authorId: number, overrides: Partial<CommentData> = {}): TestComment {
    const comment = new TestComment();
    const commentData = createCommentData(postId, authorId, overrides);

    Object.assign(comment, commentData);
    return comment;
}

/**
 * Create multiple test users
 */
export function createTestUsers(count: number, overrides: Partial<UserData> = {}): TestUser[] {
    return Array.from({ length: count }, () => createTestUser(overrides));
}

/**
 * Create multiple test posts for a user
 */
export function createTestPosts(authorId: number, count: number, overrides: Partial<PostData> = {}): TestPost[] {
    return Array.from({ length: count }, () => createTestPost(authorId, overrides));
}

/**
 * Create multiple test comments for a post
 */
export function createTestComments(
    postId: number,
    authorId: number,
    count: number,
    overrides: Partial<CommentData> = {}
): TestComment[] {
    return Array.from({ length: count }, () => createTestComment(postId, authorId, overrides));
}

/**
 * Create a full test scenario with related entities
 */
export interface TestScenario {
    users: TestUser[];
    posts: TestPost[];
    comments: TestComment[];
}

export async function createTestScenario(userCount = 3, postsPerUser = 2, commentsPerPost = 2): Promise<TestScenario> {
    const users: TestUser[] = [];
    const posts: TestPost[] = [];
    const comments: TestComment[] = [];

    // Create and save users
    for (let i = 0; i < userCount; i++) {
        const user = createTestUser();
        await user.save();
        users.push(user);
    }

    // Create and save posts
    for (const user of users) {
        for (let i = 0; i < postsPerUser; i++) {
            const post = createTestPost(user.id);
            await post.save();
            posts.push(post);
        }
    }

    // Create and save comments
    for (const post of posts) {
        for (let i = 0; i < commentsPerPost; i++) {
            // Random user comments on posts
            const randomUser = users[Math.floor(Math.random() * users.length)];
            const comment = createTestComment(post.id, randomUser.id);
            await comment.save();
            comments.push(comment);
        }
    }

    return { users, posts, comments };
}

/**
 * Invalid data generators for testing validation errors
 */
export const InvalidData = {
    user: {
        emptyName: () => createUserData({ name: '' }),
        shortName: () => createUserData({ name: 'a' }),
        invalidEmail: () => createUserData({ email: 'not-an-email' }),
        negativeAge: () => createUserData({ age: -5 }),
    },

    post: {
        emptyTitle: (authorId: number) => createPostData(authorId, { title: '' }),
        emptyContent: (authorId: number) => createPostData(authorId, { content: '' }),
        invalidAuthorId: () => createPostData(-1),
    },

    comment: {
        emptyText: (postId: number, authorId: number) => createCommentData(postId, authorId, { text: '' }),
        invalidPostId: (authorId: number) => createCommentData(-1, authorId),
        invalidAuthorId: (postId: number) => createCommentData(postId, -1),
    },
};
