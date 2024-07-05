const User = require("../models/User");
const { UnauthenticatedError, BadRequestError } = require("../errors");
const { StatusCodes } = require("http-status-codes");
const otpService = require("../services/otp");

const validateUserInput = async (req, res) => {
  const newUser = new User(req.body);
  try {
    await newUser.validate(); // validate input against the schema
    res.status(StatusCodes.OK).json({ message: "Input is valid." });
  } catch (error) {
    const errors = Object.values(error.errors); // .map((err) => err.message);
    throw new BadRequestError(errors);
  }
};

const generateOTP = async (req, res) => {
  const { email } = req.body;

  try {
    await otpService.generateOTP(email);
    res.status(StatusCodes.OK).json({ msg: "OTP sent successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ msg: "Error initiating registration" });
  }
};

const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const isValid = await otpService.verifyOTP(email, otp);
    if (!isValid) {
      throw new BadRequestError("Invalid OTP");
      //return res.status(StatusCodes.BAD_REQUEST).json({ msg: "Invalid OTP" });
    }

    const tempToken = generateTempToken();
    global.tempTokens = global.tempTokens || {};
    global.tempTokens[tempToken] = email;

    console.log("Generated tempToken:", tempToken);
    console.log("Global tempTokens:", global.tempTokens);
    res
      .status(StatusCodes.OK)
      .json({ msg: "OTP verified successfully", tempToken });
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ msg: "Error verifying OTP" });
  }
};

const register = async (req, res) => {
  //console.log("Received request body:", req.body);
  const { tempToken, ...userData } = req.body;
  //console.log("Extracted userData:", userData);
  //console.log("Received tempToken:", tempToken);
  console.log("Global tempTokens:", global.tempTokens);

  if (!global.tempTokens || !global.tempTokens[tempToken]) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ msg: "Invalid or expired token" });
  }

  const email = global.tempTokens[tempToken];

  // delete tmp token
  delete global.tempTokens[tempToken];

  try {
    if (email !== userData.email) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "Email mismatch" });
    }

    const user = await User.create(userData);
    //const token = user.createJWT() // REMOVED FOR NOW BUT IF THERE ARE CHANGES IN THE REGIST FLOW THEN MIGHT USE THIS AGAIN
    res.status(StatusCodes.CREATED).json({ user: { name: user.name } });
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ msg: "Error completing registration" });
  }
};

function generateTempToken() {
  return Math.random().toString(36).substr(2, 10);
}

const login = async (req, res) => {
  const { name, email, password } = req.body;

  switch (true) {
    case !name:
      throw new BadRequestError("Name is required.");
      break;
    case !email:
      throw new BadRequestError("Email is required.");
      break;
    case !password:
      throw new BadRequestError("Password is required.");
      break;
  }

  // check if user exists
  const user = await User.findOne({ email });
  if (!user) {
    throw new UnauthenticatedError("User Not Found");
  }

  // compare password
  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    throw new UnauthenticatedError("Incorrect Password");
  }

  console.log(user.email);
  console.log(process.env.ADMIN_EMAIL);

  //let isAdmin = false;
  if (user.email === process.env.ADMIN_EMAIL) {
    user.isAdmin = true;
  }

  token = user.createJWT();
  res
    .status(StatusCodes.OK)
    .json({ user: { name: user.name, isAdmin: user.isAdmin }, token });
};

module.exports = {
  validateUserInput,
  generateOTP,
  verifyOTP,
  register,
  login,
};
