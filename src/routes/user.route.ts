import { Router } from 'express';
import {
  activateUser,
  deleteUser,
  getAllUsers,
  getUserInfo,
  loginUser,
  logoutUser,
  registrationUser,
  socialAuth,
  updateAccessToken,
  updatePassword,
  updateProfilePicture,
  updateUserInfo,
  updateUserRole,
} from '../controllers/user.controller';
import { authorizeRoles, isAuthenticated } from '../middleware/auth';

export const userRouter = Router();

userRouter.post('/registration', registrationUser);
userRouter.post('/activate-user', activateUser);
userRouter.post('/login', updateAccessToken, loginUser);
userRouter.post('/social-auth', socialAuth);

userRouter.get ('/refresh',updateAccessToken);
userRouter.get ('/logout',isAuthenticated, logoutUser);
userRouter.get ('/me', updateAccessToken, isAuthenticated,getUserInfo);
userRouter.get ('/get-users', updateAccessToken, isAuthenticated, authorizeRoles("admin"), getAllUsers);

userRouter.put ('/update-user-info', updateAccessToken, isAuthenticated, updateUserInfo);
userRouter.put ('/update-user-pass', updateAccessToken, isAuthenticated,updatePassword);
userRouter.put ('/update-user-avatar', updateAccessToken, isAuthenticated,updateProfilePicture);
userRouter.put ('/update-user',updateAccessToken, isAuthenticated, authorizeRoles("admin"), updateUserRole);

userRouter.delete('/delete-user/:id', updateAccessToken, isAuthenticated, authorizeRoles("admin"), deleteUser);

export default userRouter;