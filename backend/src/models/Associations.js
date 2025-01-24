import { User, Project, Task } from './index.js';

// Define associations here
Project.belongsTo(User, { foreignKey: 'project_head_id', as: 'project_head' });
Project.hasMany(Task, { foreignKey: 'project_id', as: 'tasks' });

Project.belongsToMany(User, {
  through: 'UserProjects', 
  as: 'project_members',  
  foreignKey: 'projectId'
});

User.belongsToMany(Project, {
  through: 'UserProjects',
  as: 'projects',
  foreignKey: 'userId'
});

Task.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });
Task.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

export { User, Project, Task };
