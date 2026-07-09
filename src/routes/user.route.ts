import { Router } from 'express';
import {
  activateUser,
  deleteUser,
  getAllUsers,
  getUserInfo,
  loginUser,
  logoutUser,
  refreshTokenMiddleware,
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
userRouter.post('/login', loginUser);
userRouter.post('/social-auth', socialAuth);

userRouter.get ('/refresh-token',refreshTokenMiddleware, updateAccessToken);
userRouter.get ('/logout',isAuthenticated, logoutUser);
userRouter.get ('/get-user-info', refreshTokenMiddleware, isAuthenticated,getUserInfo);
userRouter.get ('/get-users', refreshTokenMiddleware, isAuthenticated, authorizeRoles("admin"), getAllUsers);

userRouter.put ('/update-user-info', refreshTokenMiddleware, isAuthenticated, updateUserInfo);
userRouter.put ('/update-user-pass', refreshTokenMiddleware, isAuthenticated,updatePassword);
userRouter.put ('/update-user-avatar', refreshTokenMiddleware, isAuthenticated,updateProfilePicture);
userRouter.put ('/update-user',refreshTokenMiddleware, isAuthenticated, authorizeRoles("admin"), updateUserRole);

userRouter.delete('/delete-user/:id', refreshTokenMiddleware, isAuthenticated, authorizeRoles("admin"), deleteUser);

export default userRouter;