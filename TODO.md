# TODO: Implement Real-Time Notifications for TMS Updates

## Tasks
- [ ] Import `emitTableEvent` in `controllers/Reservation/reservation.controller.js`
- [ ] Add socket emission for accommodation reservation creation
- [ ] Add socket emission for meeting reservation creation
- [ ] Add table update emissions when assigning table on restaurant reservation confirm
- [ ] Add table update emissions when freeing tables on reservation cancel

## Testing
- [ ] Test socket emissions for reservation creations
- [ ] Test socket emissions for table assignments on confirm
- [ ] Test socket emissions for table frees on cancel
- [ ] Verify events are broadcast to all connected clients
