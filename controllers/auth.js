//To use this in your frontend:
//
//Call /initiate-registration with the email.
//Once the user receives the OTP, call /verify-otp with the email and OTP.
//Use the returned tempToken along with the rest of the user data to call /complete-registration.

const User = require("../models/User");
const { UnauthenticatedError, BadRequestError } = require("../errors");
const { StatusCodes } = require("http-status-codes");
const otpService = require("../services/otp");

const validateUserInput = async (req, res) => {
  const newUser = new User(req.body);
  try {
    await newUser.validate(); // Validate input against the schema
    res.status(StatusCodes.OK).json({ message: "Input is valid." });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

const initiateRegistration = async (req, res) => {
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
      return res.status(StatusCodes.BAD_REQUEST).json({ msg: "Invalid OTP" });
    }

    const tempToken = generateTempToken();
    global.tempTokens = global.tempTokens || {};
    global.tempTokens[tempToken] = email;

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

const completeRegistration = async (req, res) => {
  const { tempToken, ...userData } = req.body;

  if (!global.tempTokens || !global.tempTokens[tempToken]) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ msg: "Invalid or expired token" });
  }

  const email = global.tempTokens[tempToken];
  delete global.tempTokens[tempToken];

  try {
    if (email !== userData.email) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "Email mismatch" });
    }

    const user = await User.create(userData);
    const token = user.createJWT();
    res.status(StatusCodes.CREATED).json({ user: { name: user.name }, token });
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

//const register = async (req, res) => {
//  const user = await User.create(req.body);
//  //const token = user.createJWT();
//  res.status(StatusCodes.CREATED).json({ user: { name: user.name } });
//};

const login = async (req, res) => {
  const { name, email, password } = req.body;

  if (!email || !password || !name) {
    throw new BadRequestError("Please Provide Email, Name, And Password");
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

  //console.log(user.email);
  //console.log(process.env.ADMIN_EMAIL);

  let isAdmin = false;
  if (user.email === process.env.ADMIN_EMAIL) {
    isAdmin = true;
  }

  token = user.createJWT();
  res
    .status(StatusCodes.OK)
    .json({ user: { name: user.name, isAdmin: isAdmin }, token });
};

module.exports = {
  validateUserInput,
  //register,
  initiateRegistration,
  verifyOTP,
  completeRegistration,
  login,
};
