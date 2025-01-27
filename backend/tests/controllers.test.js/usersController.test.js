import { describe, beforeEach, it, expect, vi } from 'vitest';
import { User, Task } from '../../src/models/index.js';
import { setCache, getCache } from '../../src/utils/redisUtils.js';
import { getUserProfile, getUserProjects, getUserTasks } from '../../src/controllers/usersController.js';

vi.mock('../../src/models/index.js', () => {
  return {
    User: {
      findByPk: vi.fn(),
    },
    Project: {
      findAll: vi.fn(),
    },
    Task: {
      findAll: vi.fn(),
    },
  };
});

vi.mock('../../src/utils/redisUtils.js', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(),
}));

describe('Users Controller', () => {
  const mockReq = { userId: 1};
  const mockRes = {
    status: vi.fn(() => mockRes),
    json: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Get User Profile', () => {
    it('should return cached profile when available', async () => {
      const cachedUser = { id: 1, name: 'Cached User' };
      getCache.mockResolvedValue(cachedUser);

      await getUserProfile(mockReq, mockRes);

      expect(getCache).toHaveBeenCalledWith('users:1:profile');
      expect(User.findByPk).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(cachedUser);
    });

    it('should fetch from database and set cache when no cache exists', async () => {
      const dbUser = { id: 1, name: 'DB User' };
      getCache.mockResolvedValue(null);
      User.findByPk.mockResolvedValue(dbUser);

      await getUserProfile(mockReq, mockRes);

      expect(User.findByPk).toHaveBeenCalledWith(1);
      expect(setCache).toHaveBeenCalledWith('users:1:profile', dbUser);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(dbUser);
    });

    it('should return 404 if user is not found', async () => {
      getCache.mockResolvedValue(null);
      User.findByPk.mockResolvedValue(null);

      await getUserProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'User Not Found' });
    });

    it('should handle database errors', async () => {
      getCache.mockResolvedValue(null);
      User.findByPk.mockRejectedValue(new Error('Database error'));

      await getUserProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        message: 'Error Getting User Profile' 
      });
    });
  });

  describe('getUserProjects', () => {
    it('should return cached projects when available', async () => {
      const cachedProjects = [{ id: 1, name: 'Cached Project' }];
      getCache.mockResolvedValue(cachedProjects);

      await getUserProjects(mockReq, mockRes);

      expect(getCache).toHaveBeenCalledWith('users:1:projects');
      expect(User.findByPk).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(cachedProjects);
    });

    it('should fetch projects from database and set cache', async () => {
      const mockProjects = [{ id: 1, name: 'Project 1' }];
      getCache.mockResolvedValue(null);
      User.findByPk.mockResolvedValue({ projects: mockProjects });

      await getUserProjects(mockReq, mockRes);

      expect(User.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(setCache).toHaveBeenCalledWith('users:1:projects', mockProjects);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockProjects);
    });

    it('should return 404 when user has no projects', async () => {
      getCache.mockResolvedValue(null);
      User.findByPk.mockResolvedValue({ projects: [] });

      await getUserProjects(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        message: 'No projects found for this user.' 
      });
    });
  });

  describe('getUserTasks', () => {
    it('should return cached tasks when available', async () => {
      const cachedTasks = [{ id: 1, title: 'Cached Task' }];
      getCache.mockResolvedValue(cachedTasks);

      await getUserTasks(mockReq, mockRes);

      expect(getCache).toHaveBeenCalledWith('users:1:tasks');
      expect(Task.findAll).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(cachedTasks);
    });

    it('should fetch tasks from database and set cache', async () => {
      const mockTasks = [{ id: 1, title: 'Task 1' }];
      getCache.mockResolvedValue(null);
      Task.findAll.mockResolvedValue(mockTasks);

      await getUserTasks(mockReq, mockRes);

      expect(Task.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: { assigned_to: 1 }
      }));
      expect(setCache).toHaveBeenCalledWith('users:1:tasks', mockTasks);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockTasks);
    });

    it('should return 404 when no tasks found', async () => {
      getCache.mockResolvedValue(null);
      Task.findAll.mockResolvedValue([]);

      await getUserTasks(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ 
        message: 'No tasks found for this user.' 
      });
    });
  });
})