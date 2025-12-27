import { calculateBonus } from '../domain/calculators/bonus.js';

console.log("=== Debugging calculateBonus Crash ===");

try {
    const baseVolume = 1000;
    const mockInput = {
        bonus_tod_reward: 25,
        todRewardBonusDetails: { checklist: { d1_station_r: 5 } },
        bonus_tod_increment: 0,
        todIncrementBonusDetails: {
            checklist: { inc_ratio: 16 }
        }
    };

    console.log("Calling calculateBonus...");
    const result = calculateBonus(mockInput, baseVolume);
    console.log("Result items count:", result.items.length);

    console.log("Result items keys:", result.items.map(i => i.key));
    console.log("Result items keys (JSON):", JSON.stringify(result.items.map(i => i.key)));

    const incItem = result.items.find(i => i.key === 'bonus_tod_increment');
    if (incItem) {
        console.log("Found Item Label:", incItem.label);
        console.log("Found Item Ratio:", incItem.ratio);
    } else {
        console.log("Item bonus_tod_increment NOT FOUND");
    }

    console.log("Success!");

} catch (e) {
    console.error("CRASHED!");
    console.error(e);
}
