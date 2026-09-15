const Innings = require('../models/Innings');
const { ballsToOversString, calculateRunRate, calculateRequiredRunRate } = require('../utils/cricketUtils');

const getLiveState = async (innings, targetScore) => {
  const oversString = ballsToOversString(innings.totalBalls);
  const currentRunRate = calculateRunRate(innings.totalRuns, innings.totalBalls);

  let requiredRunRate = null;
  let ballsRemaining = null;
  if (targetScore && innings.maxOvers) {
    const totalLegalBalls = innings.maxOvers * 6;
    ballsRemaining = Math.max(totalLegalBalls - innings.totalBalls, 0);
    requiredRunRate = calculateRequiredRunRate(targetScore, innings.totalRuns, ballsRemaining);
  }

  return {
    battingTeamId: innings.battingTeamId,
    battingTeamName: innings.battingTeamName,
    bowlingTeamId: innings.bowlingTeamId,
    bowlingTeamName: innings.bowlingTeamName,
    score: innings.totalRuns,
    wickets: innings.totalWickets,
    overs: oversString,
    currentRunRate,
    requiredRunRate,
    ballsRemaining,
    target: targetScore || null,
    currentStriker: innings.currentStriker,
    currentNonStriker: innings.currentNonStriker,
    currentBowler: innings.currentBowler,
    isComplete: innings.isComplete,
    status: innings.status
  };
};

module.exports = { getLiveState };
