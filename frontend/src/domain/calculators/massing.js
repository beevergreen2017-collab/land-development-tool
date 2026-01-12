export const calculateMassing = (baseVolume, totalAllowedRate, inputs, siteArea) => {
    const allowedVolumeArea = baseVolume * (totalAllowedRate / 100);

    const massingMEArea = allowedVolumeArea * (inputs.me_rate / 100);
    const flowArea = allowedVolumeArea + massingMEArea;
    const massingStairArea = flowArea * (inputs.stair_rate / 100);
    const massingBalconyArea = flowArea * (inputs.balcony_rate / 100);

    const massingGFA_NoBalcony = allowedVolumeArea + massingMEArea + massingStairArea;
    const massingGFA_Total = massingGFA_NoBalcony + massingBalconyArea;

    // Estimate Registered Area: (Allowed + Balcony) / (1 - Public%)
    const estRegisteredArea = (1 - (inputs.public_ratio / 100)) > 0
        ? (allowedVolumeArea + massingBalconyArea) / (1 - (inputs.public_ratio / 100))
        : 0;

    const saleableRatio = allowedVolumeArea > 0 ? (estRegisteredArea / allowedVolumeArea) : 0;

    const estSingleFloorArea = siteArea * (inputs.design_coverage / 100);
    const estFloors = estSingleFloorArea > 0 ? Math.ceil(massingGFA_Total / estSingleFloorArea) : 0;

    // Usage Mix Area
    const residentialArea = massingGFA_NoBalcony * (inputs.residential_rate / 100);
    const commercialArea = massingGFA_NoBalcony * (inputs.commercial_rate / 100);
    const agencyArea = massingGFA_NoBalcony * (inputs.agency_rate / 100);

    return {
        allowedVolumeArea,
        massingMEArea,
        massingStairArea,
        massingBalconyArea,
        massingGFA_NoBalcony,
        massingGFA_Total,
        estRegisteredArea,
        saleableRatio,
        estSingleFloorArea,
        estFloors,
        usageAreas: {
            residential: residentialArea,
            commercial: commercialArea,
            agency: agencyArea
        }
    };
};
