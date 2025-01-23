import { DataTypes } from "sequelize";
import { sequelize } from "../config/database";

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  }, 
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  timestamps: true,
});

// Associations
Project.belongsTo(User, { foreignKey: 'project_head_id', as: 'project_head' });
Project.belongsToMany(User, { through: 'project_members', as: 'members'});

export default Project;
