export const calculateBasement = (siteArea, inputs) => {
    const basementFloorArea = siteArea * (inputs.excavation_rate / 100);

    // Auto calculate legal parking if needed usually happens in UI, but logic is here
    // But since inputs.legal_parking is passed in often as a state, we use what is passed.

    const calcTotalParking = (inputs.legal_parking || 0) + (inputs.bonus_parking || 0);

    const totalRequiredArea = (calcTotalParking * inputs.parking_space_area) +
        ((inputs.legal_motorcycle || 0) * (inputs.motorcycle_unit_area || 4));

    const estBasementFloors = basementFloorArea > 0 ? Math.ceil(totalRequiredArea / basementFloorArea) : 0;
    const totalExcavationDepth = (estBasementFloors * inputs.floor_height) + 1.5;
    const basementTotalGFA = basementFloorArea * estBasementFloors;

    return {
        basementFloorArea,
        calcTotalParking,
        totalRequiredArea,
        estBasementFloors,
        totalExcavationDepth,
        basementTotalGFA
    };
};


