import apiClient from './client';

export const fetchLandInfo = async (district, sectionName, lotNumber) => {
    const response = await apiClient.get('/proxy/land-info', {
        params: {
            district,
            section_name: sectionName,
            lot_no: lotNumber
        },
    });
    return response.data;
};

export const addParcel = async (projectId, parcelData) => {
    const payload = {
        ...parcelData,
        area_m2: parseFloat(parcelData.area_m2),
        announced_value: parseFloat(parcelData.announced_value)
    };
    const response = await apiClient.post(`/projects/${projectId}/parcels/`, payload);
    return response.data;
};

export const updateParcel = async (parcelId, parcelData) => {
    const payload = {
        ...parcelData,
        area_m2: parseFloat(parcelData.area_m2),
        announced_value: parseFloat(parcelData.announced_value)
    };
    const response = await apiClient.put(`/land_parcels/${parcelId}`, payload);
    return response.data;
};
