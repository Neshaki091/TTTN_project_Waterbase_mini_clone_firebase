const Event = require('../models/event.model');

/**
 * EventRepository handles all database interactions for raw events.
 * Adheres to SRP and DIP.
 */
class EventRepository {
  async create(eventData) {
    const event = new Event(eventData);
    return event.save();
  }

  async findUnprocessed(filter = {}) {
    return Event.find({ ...filter, processed: false });
  }

  async findByPeriod(start, end, filter = {}) {
    return Event.find({
      ...filter,
      timestamp: { $gte: start, $lt: end },
      processed: false
    });
  }

  async markAsProcessed(eventIds) {
    return Event.updateMany(
      { _id: { $in: eventIds } },
      { $set: { processed: true } }
    );
  }
}

module.exports = new EventRepository();
