const { z } = require("zod");

const registerUserSchema = z.object({
    fullName: z
        .string({ required_error: "Name is required" })
        .min(3, "Name must be at least 3 characters long"),

    email: z
        .string({ required_error: "Email is required" })
        .email("Invalid email address"),

    password: z
        .string({ required_error: "Password is required" })
        .min(6, "Password must be at least 6 characters long"),

    phone: z
        .string({ required_error:"Phone Number is required"})
        .min(10, "phone number must be of 10 digits")
        .max(10, "phone number must be of 10 digits")
});

module.exports = {
    registerUserSchema,
};
