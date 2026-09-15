const ballsToOversString = (totalBalls) => {
    const overs = Math.floor(totalBalls / 6);
    const balls = totalBalls % 6;
    return `${overs}.${balls}`;
};

const oversStringToBalls = (overStr) => {
    const parts = overStr.toString().split('.');
    const overs = parseInt(parts[0], 10) || 0;
    const balls = parts[1] ? parseInt(parts[1], 10) : 0;
    return (overs * 6) + balls;
};

const calculateRunRate = (runs, balls) => {
    if (balls === 0) return 0;
    return Number(((runs / balls) * 6).toFixed(2));
};

const calculateRequiredRunRate = (target, currentScore, ballsRemaining) => {
    if (ballsRemaining <= 0) return 0;
    const runsNeeded = target - currentScore;
    if (runsNeeded <= 0) return 0;
    return Number(((runsNeeded / ballsRemaining) * 6).toFixed(2));
};

const getMaxOversForBowler = (format, totalOvers) => {
    switch (format) {
        case 'T20': return 4;
        case 'ODI': return 10;
        case 'Test': return null;
        case 'Custom': return totalOvers ? Math.ceil(totalOvers / 5) : null;
        default: return null;
    }
};

const getMaxOvers = (format, customOvers) => {
    switch (format) {
        case 'T20': return 20;
        case 'ODI': return 50;
        case 'Test': return null;
        case 'Custom': return customOvers || null;
        default: return null;
    }
};

const getMaxWicketsForInnings = (isSuperOver) => (isSuperOver ? 2 : 10);

const formatMatchResult = (match) => {
    if (!match || !match.result || !match.result.winner) return 'No result';
    const { winner, margin, marginType, method } = match.result;
    let resultStr = `${winner} won by ${margin} ${marginType}`;
    if (method) resultStr += ` (${method})`;
    return resultStr;
};

module.exports = {
    ballsToOversString,
    oversStringToBalls,
    calculateRunRate,
    calculateRequiredRunRate,
    getMaxOversForBowler,
    getMaxOvers,
    getMaxWicketsForInnings,
    formatMatchResult
};
