import { Router } from "express";
import { submitContact, getContacts, getContactById, updateContactStatus } from "../controllers/Contact.controller";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";


const contactRouter = Router();

contactRouter.post("/submit-contact", submitContact);

contactRouter.get("/get-all-contacts",isAuthenticated,authorizeRoles("admin"), getContacts );
contactRouter.get("/get-contact/:id", isAuthenticated,authorizeRoles("admin"),getContactById );
contactRouter.patch("/update-status/:id",isAuthenticated,authorizeRoles("admin"), updateContactStatus);

export default contactRouter;