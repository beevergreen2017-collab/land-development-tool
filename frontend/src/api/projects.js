import apiClient from './client';

export const fetchProjects = async () => {
    const response = await apiClient.get('/projects/');
    return response.data;
};

export const fetchProjectDetails = async (id) => {
    const response = await apiClient.get(`/projects/${id}`);
    return response.data;
};

export const createProject = async (name) => {
    const response = await apiClient.post('/projects/', { name });
    return response.data;
};

export const updateProject = async (id, data) => {
    const response = await apiClient.put(`/projects/${id}`, data);
    return response.data;
};
