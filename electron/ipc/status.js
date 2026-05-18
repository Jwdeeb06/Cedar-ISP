function computeStatus({ blocked, expiry_date }) {
  if (Number(blocked) === 1) return "SUSPENDED";

  if (!expiry_date) return "INACTIVE";

  const today = new Date();
  const exp = new Date(expiry_date + "T23:59:59");

  return today <= exp ? "ACTIVE" : "INACTIVE";
}

module.exports = { computeStatus };
