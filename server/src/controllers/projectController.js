import * as projectService from "../services/projectService.js";

export async function createProject(req, res, next) {
  try {
    res.status(201).json(await projectService.createProject(req.user._id, req.body));
  } catch (error) {
    next(error);
  }
}

export async function listProjects(req, res, next) {
  try {
    res.json(await projectService.getProjects(req.user._id, req.query));
  } catch (error) {
    next(error);
  }
}

export async function getProject(req, res, next) {
  try {
    res.json(await projectService.getProjectDetails(req.params.projectId));
  } catch (error) {
    next(error);
  }
}

export async function updateProject(req, res, next) {
  try {
    res.json(await projectService.updateProject({
      projectId: req.params.projectId,
      userId: req.user._id,
      payload: req.body
    }));
  } catch (error) {
    next(error);
  }
}

export async function deleteProject(req, res, next) {
  try {
    await projectService.deleteProject({
      projectId: req.params.projectId,
      userId: req.user._id
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function inviteMember(req, res, next) {
  try {
    res.status(201).json(await projectService.inviteMember({
      projectId: req.params.projectId,
      email: req.body.email,
      role: req.body.role,
      invitedBy: req.user._id
    }));
  } catch (error) {
    next(error);
  }
}

export async function acceptInvite(req, res, next) {
  try {
    await projectService.acceptInvite({ userId: req.user._id, ...req.body });
    res.json({ message: "Invitation accepted." });
  } catch (error) {
    next(error);
  }
}

export async function validateInvite(req, res, next) {
  try {
    res.json(await projectService.validateInvite(req.query));
  } catch (error) {
    next(error);
  }
}
