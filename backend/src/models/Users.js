import { DataTypes } from 'sequelize';
import { sequelize } from "../config/database";

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
  }, 
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'user',
  }
},  {
  timestamps: true,
})

// Associations
User.belongsToMany(Project, { through: 'ProjectMembers', as: 'projects' });

export default User;