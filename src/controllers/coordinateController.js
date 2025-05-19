import Coordinate from "../models/coordinate.js";
import asyncHandler from "../middlewares/asyncHandler.js";

const createCoordinate = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;
  const userId = req.user._id;

  const coordinate = await Coordinate.create({
    userId,
    latitude,
    longitude,
  });

  res.status(201).json({
    data: coordinate,
  });
});

const getCoordinateByUserId = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    
    const coordinates = await Coordinate.findOne({ userId });
    
    if (!coordinates) {
        res.status(404);
        throw new Error("Coordinates not found");
    }
    
    res.status(200).json({
        data: coordinates,
    });
})

const updateCoordinateById = asyncHandler(async (req, res) => {
    const { latitude, longitude } = req.body;

    const coordinate = await Coordinate.findById(req.params.id);

    if (req.user._id.toString() !== coordinate.userId.toString()) {
        res.status(403);
        throw new Error("You are not authorized to update this coordinate");
    }

    if (!coordinate) {
        res.status(404);
        throw new Error("Coordinate not found");
    }
    
    coordinate.latitude = latitude || coordinate.latitude;
    coordinate.longitude = longitude || coordinate.longitude;

    coordinate.save();
    
    res.status(200).json({
        data: coordinate,
    });
})

export default {
    createCoordinate: createCoordinate,
    getCoordinateByUserId: getCoordinateByUserId,
    updateCoordinateById: updateCoordinateById,
};


