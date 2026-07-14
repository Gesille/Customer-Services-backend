import { Router } from "express";
import { submitQuestion, getPublishedQuestions, getAllQuestions, addGeneralQuestion, answerQuestion, togglePublish, deleteQuestion } from "../controllers/Question.controller";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";



const questionsRouter = Router();

questionsRouter.post("/submit-questions", submitQuestion);
questionsRouter.get("/published", getPublishedQuestions);


questionsRouter.get("/get-all-questions", getAllQuestions);
questionsRouter.post("/general-question", isAuthenticated,authorizeRoles("admin"), addGeneralQuestion );
questionsRouter.patch("/answer-by-id/:id",isAuthenticated,authorizeRoles("admin"), answerQuestion );
questionsRouter.patch("/publish-by-id/:id", isAuthenticated,authorizeRoles("admin"), togglePublish );
questionsRouter.delete("/delete-question/:id", isAuthenticated,authorizeRoles("admin"), deleteQuestion);

export default questionsRouter;