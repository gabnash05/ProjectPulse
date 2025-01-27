import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { User, Project, Task } from '../../src/models/index.js';
import { sequelize } from '../../src/config/database.js';
import { setCache, getCache, deleteCache, deleteCacheByPattern } from '../../src/utils/redisUtils.js';
import { getProject, getAllProjectTasks, getAllProjectMembers, createProject, addProjectMember, updateProject, deleteProject, removeProjectMember } from '../../src/controllers/projectsController.js';

vi.mock('../../src/models/index.js', () => {
  return {
    User: {
      findByPk: vi.fn(),
      findOne: vi.fn(),
    },
    Project: {
      findByPk: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
    },
  }
});

vi.mock('../../src/utils/redisUtils.js', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(),
  deleteCache: vi.fn(), 
  deleteCacheByPattern: vi.fn(),
}));

describe('Projects Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  })

  describe('Get Project', () => {
    const mockReq = { userId: 1,
      params: { projectId: 123 },
    };
    const mockRes = {
      status: vi.fn(() => mockRes),
      json: vi.fn(),
    };

    it('should return project data from cache if available', async () => {
      const cachedProject = { id: 123, name: 'Cached Project', project_head_id: 1, project_members: [] };
      getCache.mockResolvedValue(cachedProject);
  
      await getProject(mockReq, mockRes);
  
      expect(getCache).toHaveBeenCalledWith('projects:123:user:1');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(cachedProject);
    });
    
    it('should return project data from DB if not in cache and cache the result', async () => {
      const dbProject = {
        id: 123,
        name: 'DB Project',
        project_head_id: 1,
        project_members: [{ id: 1, username: 'JohnDoe', email: 'john@example.com' }],
      };
      getCache.mockResolvedValue(null);
      Project.findByPk.mockResolvedValue(dbProject);
      setCache.mockResolvedValue();
  
      await getProject(mockReq, mockRes);
  
      expect(getCache).toHaveBeenCalledWith('projects:123:user:1');
      expect(Project.findByPk).toHaveBeenCalledWith(123, {
        include: [{
          model: User,
          as: 'project_members',
          attributes: ['id', 'username', 'email'],
        }],
      });
      expect(setCache).toHaveBeenCalledWith('projects:123:user:1', dbProject);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(dbProject);
    });
  
    it('should return 404 if project is not found', async () => {
      getCache.mockResolvedValue(null);
      Project.findByPk.mockResolvedValue(null);
  
      await getProject(mockReq, mockRes);
  
      expect(getCache).toHaveBeenCalledWith('projects:123:user:1');
      expect(Project.findByPk).toHaveBeenCalledWith(123, {
        include: [{
          model: User,
          as: 'project_members',
          attributes: ['id', 'username', 'email'],
        }],
      });
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Project not found' });
    });
  
    it('should return 403 if user is not authorized to access the project', async () => {
      const dbProject = {
        id: 123,
        name: 'Unauthorized Project',
        project_head_id: 2, // Different user
        project_members: [{ id: 3, username: 'JaneDoe', email: 'jane@example.com' }],
      };
      getCache.mockResolvedValue(null);
      Project.findByPk.mockResolvedValue(dbProject);
  
      await getProject(mockReq, mockRes);
  
      expect(getCache).toHaveBeenCalledWith('projects:123:user:1');
      expect(Project.findByPk).toHaveBeenCalledWith(123, {
        include: [{
          model: User,
          as: 'project_members',
          attributes: ['id', 'username', 'email'],
        }],
      });
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'You are not authorized to access tasks for this project' });
    });
  
    it('should return 500 if an error occurs', async () => {
      const error = new Error('Database error');
      getCache.mockRejectedValue(error);
  
      await getProject(mockReq, mockRes);
  
      expect(getCache).toHaveBeenCalledWith('projects:123:user:1');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Error fetching project' });
    });
  });

  describe('getAllProjectTasks', () => {
    const mockReq = { userId: 1,
      params: { projectId: 1 },
    };
    const mockRes = {
      status: vi.fn(() => mockRes),
      json: vi.fn(),
    };

    it('should return cached tasks when available', async () => {
      const cachedTasks = [{ id: 1, name: 'Task 1' }];
      getCache.mockResolvedValue(cachedTasks);

      await getAllProjectTasks(mockReq, mockRes);

      expect(getCache).toHaveBeenCalledWith('projects:1:user:1:tasks');
      expect(Project.findByPk).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(cachedTasks);
    });

    it('should fetch tasks from DB when cache is empty', async () => {
      getCache.mockResolvedValue(null);

      const taskData = [
        { id: 1, name: 'Task 1', assignee: { id: 2, username: 'user2', email: 'user2@example.com' } },
        { id: 2, name: 'Task 2', assignee: { id: 3, username: 'user3', email: 'user3@example.com' } },
      ];
      const project = {
        id: 1,
        project_head_id: 1,
        project_members: [{ id: 1 }],
        getTasks: vi.fn(() => taskData),
      };
      Project.findByPk.mockResolvedValue(project);

      await getAllProjectTasks(mockReq, mockRes);

      expect(getCache).toHaveBeenCalledWith('projects:1:user:1:tasks');
      expect(Project.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(project.getTasks).toHaveBeenCalledWith(expect.any(Object));
      expect(setCache).toHaveBeenCalledWith('projects:1:user:1:tasks', taskData);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(taskData);
    });

    it('should return 404 if project does not exist', async () => {
      getCache.mockResolvedValue(null);
      Project.findByPk.mockResolvedValue(null);

      await getAllProjectTasks(mockReq, mockRes);

      expect(getCache).toHaveBeenCalledWith('projects:1:user:1:tasks');
      expect(Project.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Project not found' });
    });

    it('should return 403 if user is not authorized', async () => {
      getCache.mockResolvedValue(null);
      const project = {
        id: 1,
        project_head_id: 2,
        project_members: [{ id: 3 }, { id: 2 }],
      };
      Project.findByPk.mockResolvedValue(project);

      await getAllProjectTasks(mockReq, mockRes);

      expect(getCache).toHaveBeenCalledWith('projects:1:user:1:tasks');
      expect(Project.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'You are not authorized to access tasks for this project' });
    });

    it('should return 500 on error', async () => {
      getCache.mockRejectedValue(new Error('Redis error'));

      await getAllProjectTasks(mockReq, mockRes);

      expect(getCache).toHaveBeenCalledWith('projects:1:user:1:tasks');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Error fetching tasks' });
    });
  });

  // WRITE TESTS FOR getAllProjectMembers, createProject, addProjectMember, updateProject, deleteProject, removeProjectMember
})