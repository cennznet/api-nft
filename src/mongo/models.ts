import mongoose from "mongoose";

const { Schema } = mongoose;
const EventTrackerCol = "EventTracker";

const EventTrackerSchema = new Schema(
	{
		streamId: String, // stream id
		streamType: Number,
		eventType: String,
		version: String, // blocknumber
		data: Object,
		signer: String,
	},
	{ collection: EventTrackerCol }
);
EventTrackerSchema.index(
	{ streamId: 1, version: 1, eventType: 1 },
	{ unique: true }
);

const LastBlockScannedCol = "LastBlockScan";
const LastBlockScanSchema = new Schema(
	{
		_id: String,
		processedBlock: { type: String, default: "0" },
		finalizedBlock: String,
	},
	{ collection: LastBlockScannedCol }
);

module.exports = {
	EventTracker: mongoose.model("EventTracker", EventTrackerSchema),
	EventTrackerCol,
	LastBlockScan: mongoose.model("LastBlockScan", LastBlockScanSchema),
	LastBlockScannedCol,
};
