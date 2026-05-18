import { electronApi } from "./electronApi";

export const mapApi = {
  getUsers:           ()        => electronApi.mapGetUsers(),
  updateUserLocation: (payload) => electronApi.mapUpdateUserLocation(payload),

  listStations:  ()        => electronApi.mapListStations(),
  addStation:    (payload) => electronApi.mapAddStation(payload),
  updateStation: (payload) => electronApi.mapUpdateStation(payload),
  deleteStation: (id)      => electronApi.mapDeleteStation(id),

  listFiberBoxes:  ()        => electronApi.mapListFiberBoxes(),
  addFiberBox:     (payload) => electronApi.mapAddFiberBox(payload),
  updateFiberBox:  (payload) => electronApi.mapUpdateFiberBox(payload),
  deleteFiberBox:  (id)      => electronApi.mapDeleteFiberBox(id),
};