function logAction(db, {
  actor = "system",
  action,
  entity,
  entity_id = null,
  message = null,
  before = null,
  after = null
}) {
  const sql = `
    INSERT INTO activity_log
    (actor, action, entity, entity_id, message, before_json, after_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(sql, [
    actor,
    action,
    entity,
    entity_id,
    message,
    before ? JSON.stringify(before) : null,
    after ? JSON.stringify(after) : null
  ]);

  db.run(sql, [
  actor, action, entity, entity_id, message,
  before ? JSON.stringify(before) : null,
  after  ? JSON.stringify(after)  : null,
], (err) => {
  if (err) console.error("[activityLog] Failed to insert:", err.message);
});
}

module.exports = { logAction };