const express = require("express")
const app = express()
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const Razorpay = require("razorpay");
const { Resend } = require("resend");
const jwt = require("jsonwebtoken");
app.use(express.json())

const crypto = require("crypto");

const resend = new Resend(
    "re_LZh4tsZm_3fjs4FNxFRUxznDNKKzMB5BC"
  );
  
const razorpay = new Razorpay({
    key_id: "rzp_test_T1okaTrOKwTAGQ",
    key_secret: "t8TasPW1A0zauajyfr0w2YQy"
  });



const auth = (...allowedRoles) => {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
  
        if (!authHeader) {
          return res.status(401).json({
            success: false,
            message: "Authorization token is required",
          });
        }
  
        if (!authHeader.startsWith("Bearer ")) {
          return res.status(401).json({
            success: false,
            message: "Invalid authorization format",
          });
        }
  
        const token = authHeader.split(" ")[1];
  
        const decoded = jwt.verify(
          token,
        "JAROMJERY"
        );

  
        req.user = {
          userId: decoded.userId,
          tenantId: decoded.tenantId || null,
          role: decoded.role,
        };
  
        if (
          allowedRoles.length > 0 &&
          !allowedRoles.includes(req.user.role)
        ) {
          return res.status(403).json({
            success: false,
            message: "You do not have permission to access this resource",
          });
        }
  
        next();
  
      } catch (error) {
  
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token",
        });
  
      }
    };
  };

app.get("/", auth("SUPER_ADMIN"),async(req,res)=>{
const user = await prisma.user.findMany()
res.json({user})
})  

app.post("/api/v1/create-super-admin", async (req, res) => {
    try {
      const existing = await prisma.user.findFirst({
        where: {
          role: "SUPER_ADMIN",
        },
      });
  
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Super Admin already exists",
        });
      }
  
      const superAdmin = await prisma.user.create({
        data: {
          name: "Jarom",
          email: "jarom@crewmate.in",
          password: "123456",
          role: "SUPER_ADMIN",
        },
      });
  
      return res.status(201).json({
        success: true,
        superAdmin,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

app.post("/api/v1/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
  
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }
  
      const user = await prisma.user.findUnique({
        where: {
          email,
        },
        include: {
          tenant: true,
        },
      });
  
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
  
      // Later replace with bcrypt
      if (user.password !== password) {
        return res.status(401).json({
          success: false,
          message: "Invalid password",
        });
      }
  
      const payload = {
        userId: user.userId,
        role: user.role,
      };
      
      if (user.tenantId) {
        payload.tenantId = user.tenantId;
      }
      
      const token = jwt.sign(
        payload,
        "JAROMJERY",
        {
          expiresIn: "7d",
        }
      );

      let redirectUrl = null;
  
      if (user.role === "SUPER_ADMIN") {
        redirectUrl =
          "https://superadmin.app.crewmate.in";
      }
  
      if (
        user.role === "ADMIN" ||
        user.role === "STAFF"
      ) {
        redirectUrl =
          user.tenant?.customAdminUrl
            ? `https://${user.tenant.customAdminUrl}`
            : user.tenant?.adminUrl;
      }
  
      if (user.role === "USER") {
        redirectUrl =
          user.tenant?.customAppUrl
            ? `https://${user.tenant.customAppUrl}`
            : user.tenant?.appUrl;
      }
  
      return res.status(200).json({
        success: true,
        message: "Login successful",
        token,
        redirectUrl,
        user: {
          userId: user.userId,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        },
      });
  
    } catch (error) {
  
      return res.status(500).json({
        success: false,
        message: error.message,
      });
  
    }
  });  





  app.post("/api/v1/plans", auth("SUPER_ADMIN"), async (req, res) => {
    try {
      const {
        name,
        description,
        monthlyPrice,
        yearlyPrice,
        trialDays,
        maxStaff,
        maxUsers,
        storageLimitGB,
        customDomain,
        whatsappIntegration,
        apiAccess,
        prioritySupport,
      } = req.body;
  
      const existingPlan = await prisma.plan.findUnique({
        where: { name },
      });
  
      if (existingPlan) {
        return res.status(400).json({
          success: false,
          message: "Plan already exists",
        });
      }

        // Monthly Razorpay Plan
    const monthlyRazorpayPlan =
    await razorpay.plans.create({
      period: "monthly",
      interval: 1,
      item: {
        name: `${name} Monthly`,
        amount: Math.round(monthlyPrice * 100),
        currency: "INR",
        description:
          description || `${name} Monthly Plan`,
      },
    });

  // Yearly Razorpay Plan
  const yearlyRazorpayPlan =
    await razorpay.plans.create({
      period: "yearly",
      interval: 1,
      item: {
        name: `${name} Yearly`,
        amount: Math.round(yearlyPrice * 100),
        currency: "INR",
        description:
          description || `${name} Yearly Plan`,
      },
    });
  
      const plan = await prisma.plan.create({
        data: {
          name,
          description,
          monthlyPrice,
          yearlyPrice,
          trialDays,
          maxStaff,
          maxUsers,
          storageLimitGB,
          customDomain,
          whatsappIntegration,
          apiAccess,
          prioritySupport,
          razorpayMonthlyPlanId:monthlyRazorpayPlan.id,
          razorpayYearlyPlanId:yearlyRazorpayPlan.id,
        },
      });
  
      return res.status(201).json({
        success: true,
        message: "Plan created successfully",
        plan,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  app.get("/api/v1/plans", auth("SUPER_ADMIN"), async (req, res) => {
    try {
      const plans = await prisma.plan.findMany({
        orderBy: {
          monthlyPrice: "asc",
        },
      });
  
      return res.status(200).json({
        success: true,
        count: plans.length,
        plans,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  app.get("/api/v1/plans/:planId", auth("SUPER_ADMIN"), async (req, res) => {
    try {
      const { planId } = req.params;
  
      const plan = await prisma.plan.findUnique({
        where: {
          planId,
        },
      });
  
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: "Plan not found",
        });
      }
  
      return res.status(200).json({
        success: true,
        plan,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  app.put("/api/v1/plans/:planId", auth("SUPER_ADMIN"), async (req, res) => {
    try {
      const { planId } = req.params;
  
      const plan = await prisma.plan.update({
        where: {
          planId,
        },
        data: req.body,
      });
  
      return res.status(200).json({
        success: true,
        message: "Plan updated successfully",
        plan,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  app.delete("/api/v1/plans/:planId", auth("SUPER_ADMIN"), async (req, res) => {
    try {
      const { planId } = req.params;
  
      const plan = await prisma.plan.update({
        where: {
          planId,
        },
        data: {
          isActive: false,
        },
      });
  
      return res.status(200).json({
        success: true,
        message: "Plan deactivated successfully",
        plan,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });






  app.get("/api/v1/public/plans", async (req, res) => {
    try {
      const plans = await prisma.plan.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          monthlyPrice: "asc",
        },
      });
  
      res.status(200).json({
        success: true,
        plans,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  app.post("/api/v1/signup", async (req, res) => {
    try {
  
      const {
        name,
        email,
        companyName,
        companySlug
      } = req.body;
  
      if (
        !name ||
        !email ||
        !companyName ||
        !companySlug
      ) {
        return res.status(400).json({
          success: false,
          message: "All fields are required"
        });
      }
  
      const slug = companySlug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
  
      // Check email already exists in Tenant
      const existingTenantEmail = await prisma.tenant.findUnique({
          where: {
            email
          }
        });
  
      if (existingTenantEmail) {
        return res.status(400).json({
          success: false,
          message: "Account already exists"
        });
      }
  
      // Check slug already used by another tenant
      const existingTenantSlug = await prisma.tenant.findUnique({
          where: {
            companySlug: slug
          }
        });
  
      if (existingTenantSlug) {
        return res.status(400).json({
          success: false,
          message: "Slug already exists"
        });
      }
  
      const otp = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
  
      const expiresAt = new Date(
        Date.now() + 15 * 60 * 1000
      );
  
      await prisma.registration.upsert({
        where: {
          email
        },
        update: {
          name,
          companyName,
          companySlug: slug,
          otp,
          otpVerified: false,
          expiresAt
        },
        create: {
          name,
          email,
          companyName,
          companySlug: slug,
          otp,
          otpVerified: false,
          expiresAt
        }
      });
  
      await resend.emails.send({
        from: "noreply@crewmate.in",
        to: email,
        subject: "Your OTP Verification Code",
        html: `
          <h2>${otp}</h2>
          <p>Your OTP is valid for 15 minutes.</p>
        `
      });
  
      return res.status(200).json({
        success: true,
        message: "OTP sent successfully"
      });
  
    } catch (error) {
  
      console.error(error);
  
      return res.status(500).json({
        success: false,
        message: error.message
      });
  
    }
  });

  app.post("/api/v1/verify-otp", async (req, res) => {
    try {
      const {
        email,
        otp
      } = req.body;
  
      const registration =
        await prisma.registration.findUnique({
          where: {
            email
          }
        });
  
      if (!registration) {
        return res.status(404).json({
          success: false,
          message:
            "Registration not found"
        });
      }
  
      if (
        registration.expiresAt <
        new Date()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "OTP expired"
        });
      }
  
      if (
        registration.otp !== otp
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid OTP"
        });
      }
  
      await prisma.registration.update({
        where: {
          email
        },
        data: {
          otpVerified: true,
          otp: null, // Clear the OTP
          expiresAt: null // Clear expiry
        }
      });
  
      return res.json({
        success: true,
        message:
          "OTP verified successfully"
      });
  
    } catch (error) {
  
      return res.status(500).json({
        success: false,
        message: error.message
      });
  
    }
  
  });

  app.post("/api/v1/select-plan", async (req, res) => {
    try {
  
      const { email, planId, billingCycle } = req.body;
  
      if (!email || !planId || !billingCycle) {
        return res.status(400).json({
          success: false,
          message: "Email, planId and billingCycle are required"
        });
      }
  
      const registration = await prisma.registration.findUnique({
        where: {
          email
        }
      });
  
      if (!registration) {
        return res.status(404).json({
          success: false,
          message: "Registration not found"
        });
      }
  
      if (!registration.otpVerified) {
        return res.status(400).json({
          success: false,
          message: "Verify OTP first"
        });
      }
  
      const plan = await prisma.plan.findUnique({
        where: {
          planId
        }
      });
  
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: "Plan not found"
        });
      }
  
      await prisma.registration.update({
        where: {
          email
        },
        data: {
          selectedPlanId: planId,
          selectedBillingCycle: billingCycle
        }
      });
  
      return res.status(200).json({
        success: true,
        message: "Plan selected successfully"
      });
  
    } catch (error) {
  
      console.error(error);
  
      return res.status(500).json({
        success: false,
        message: error.message
      });
  
    }
  });

  app.post("/api/v1/create-subscription", async (req, res) => {
    try {
      const { email } = req.body;
      const registration =
        await prisma.registration.findUnique({
          where: {
            email
          }
        });
  
      if (!registration) {
        return res.status(404).json({
          success: false,
          message: "Registration not found"
        });
      }
  
      if (!registration.otpVerified) {
        return res.status(400).json({
          success: false,
          message: "Verify OTP first"
        });
      }
  
      if (!registration.selectedPlanId) {
        return res.status(400).json({
          success: false,
          message: "Select plan first"
        });
      }
  
      const plan =
        await prisma.plan.findUnique({
          where: {
            planId: registration.selectedPlanId
          }
        });
  
      if (!plan || !plan.isActive) {
        return res.status(404).json({
          success: false,
          message: "Plan not found"
        });
      }
  
      const razorpayPlanId = registration.selectedBillingCycle === "MONTHLY"
      ? plan.razorpayMonthlyPlanId
      : plan.razorpayYearlyPlanId;

    if (!razorpayPlanId) {
      return res.status(400).json({
        success: false,
        message: "Plan configuration error. Please contact support."
      });
    }
  
    const subscriptionPayload = {
      plan_id: razorpayPlanId,
      customer_notify: 1,
      total_count: 120,
      notes: {
        email: registration.email,
        companyName: registration.companyName,
      },
    };

    // Apply trial period if configured
if (plan.trialDays > 0) {
  const trialEndTimestamp = Math.floor(
    (Date.now() + plan.trialDays * 24 * 60 * 60 * 1000) / 1000
  );

  subscriptionPayload.start_at = trialEndTimestamp;
}

const subscription = await razorpay.subscriptions.create(
  subscriptionPayload
);

        await prisma.registration.update({
          where: { email },
          data: {
            razorpaySubscriptionId: subscription.id,
            paymentAuthenticatedCompleted: false
          }
        });
  
      return res.status(200).json({
        success: true,
        subscriptionId: subscription.id,
        subscription
      });
  
    } catch (error) {
  
      console.error(error);
  
      return res.status(500).json({
        success: false,
        message: error.message
      });
  
    }
  });

  app.post("/api/v1/webhook", async (req, res) => {
    try {
      // Verify Webhook Signature
      const signature = req.headers["x-razorpay-signature"];
  
      const expectedSignature = crypto
        .createHmac(
          "sha256",
          process.env.RAZORPAY_WEBHOOK_SECRET
        )
        .update(JSON.stringify(req.body))
        .digest("hex");
  
      if (signature !== expectedSignature) {
        console.log("❌ Invalid Webhook Signature");
  
        return res.status(400).json({
          success: false,
          message: "Invalid webhook signature",
        });
      }
  
      const event = req.body;
  
      console.log("=======================================");
      console.log("📨 Event:", event.event);
      console.log("=======================================");
  
      switch (event.event) {
        case "subscription.authenticated": {
  
          const subscription =
            event.payload.subscription.entity;
  
          console.log("Subscription ID:", subscription.id);
  
          // Find Registration
          const registration =
            await prisma.registration.findFirst({
              where: {
                razorpaySubscriptionId: subscription.id,
              },
            });
  
          console.log("Registration Found:", registration);
  
          if (!registration) {
            console.log("❌ Registration Not Found");
  
            return res.status(200).json({
              success: true,
              message: "Registration not found",
            });
          }
  
          // Check Existing Tenant
          const existingTenant =
            await prisma.tenant.findUnique({
              where: {
                email: registration.email,
              },
            });
  
          if (existingTenant) {
            console.log("⚠️ Tenant Already Exists");
  
            return res.status(200).json({
              success: true,
              message: "Tenant already exists",
            });
          }
  
          // Transaction
          const tenant = await prisma.$transaction(async (tx) => {
  
            const createdTenant =
              await tx.tenant.create({
                data: {
                  name: registration.name,
                  email: registration.email,
  
                  companyName:
                    registration.companyName,
  
                  companySlug:
                    registration.companySlug,
  
                  adminUrl:
                    `${registration.companySlug}.admin.crewmate.in`,
  
                  appUrl:
                    `${registration.companySlug}.app.crewmate.in`,
  
                  selectedPlanId:
                    registration.selectedPlanId,
  
                  selectedBillingCycle:
                    registration.selectedBillingCycle,
  
                  status: "TRIAL",
  
                  isActive: true,
  
                  paymentAuthenticatedCompleted: true,
  
                  paymentAuthenticatedAt: new Date(),
  
                  signupAt:
                    registration.createdAt,
                },
              });
  
            await tx.registration.delete({
              where: {
                email: registration.email,
              },
            });
  
            return createdTenant;
          });
  
          console.log("=======================================");
          console.log("✅ Tenant Created");
          console.log("Tenant ID :", tenant.tenantId);
          console.log("Email     :", tenant.email);
          console.log("Company   :", tenant.companyName);
          console.log("=======================================");
  
          break;
        }
  
        case "payment.authorized":
          console.log("💳 Payment Authorized");
          break;
  
        case "refund.created":
          console.log("💸 Refund Created");
          break;
  
        case "refund.processed":
          console.log("✅ Refund Processed");
          break;
  
        default:
          console.log("Unhandled Event:", event.event);
      }
  
      return res.status(200).json({
        success: true,
      });
  
    } catch (error) {
  
      console.error("=======================================");
      console.error("❌ WEBHOOK ERROR");
      console.error(error);
      console.error("=======================================");
  
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // app.post('/api/v1/webhook', async (req, res) => {
  //   try {
  //     // ... signature verification ...
  //           const signature = req.headers['x-razorpay-signature'];
  //           const expectedSignature = crypto
  //             .createHmac('sha256', "t8TasPW1A0zauajyfr0w2YQy")
  //             .update(JSON.stringify(req.body))
  //             .digest('hex');
        
  //           if (expectedSignature !== signature) {
  //             console.log('❌ Invalid webhook signature');
  //             return res.status(400).json({ 
  //               success: false, 
  //               message: 'Invalid signature' 
  //             });
  //           }
        
  //           const event = req.body;
  //           console.log('📨 Webhook Received:', event.event);
      
  //           if (event.event === "subscription.authenticated") {

  //             const razorpaySubscription = event.payload.subscription.entity;

  //             console.log("Subscription ID:", razorpaySubscription.id);
            
  //             const registration = await prisma.registration.findFirst({
  //                 where: {
  //                   razorpaySubscriptionId: razorpaySubscription.id,
  //                 },
  //               });
            
  //             if (!registration) {
  //               return res.status(200).json({
  //                 success: true,
  //                 message: "Registration not found",
  //               });
  //             }
            
  //             // Prevent duplicate tenant creation
  //             const existingTenant = await prisma.tenant.findUnique({
  //                 where: {
  //                   email: registration.email,
  //                 },
  //               });
            
  //             if (existingTenant) {
  //               return res.status(200).json({
  //                 success: true,
  //                 message: "Tenant already exists",
  //               });
  //             }
            
  //             const tenant = await prisma.tenant.create({
  //                 data: {
  //                   name: registration.name,
  //                   email: registration.email,
  //                   companyName: registration.companyName,
  //                   companySlug: registration.companySlug,
  //                   adminUrl: `${registration.companySlug}.admin.crewmate.in`,
  //                   appUrl: `${registration.companySlug}.app.crewmate.in`,
  //                   selectedPlanId: registration.selectedPlanId,
  //                   selectedBillingCycle:  registration.selectedBillingCycle,
  //                   status: "TRIAL",
  //                   paymentAuthenticatedCompleted: true,
  //                   signupAt:registration.createdAt,
  //                   otpVerified: true,
  //                   isActive: true,
  //                 },
  //               });
            
  //             console.log(
  //               "✅ Tenant Created:",
  //               tenant.tenantId
  //             );
            
  //             // Optional: Mark registration completed
  //             await prisma.registration.delete({
  //               where: {
  //                 email: registration.email,
  //               },
  //             });
  //           }
      
  //     res.status(200).json({ success: true });
  //   } catch (error) {
  //     res.status(200).json({ success: false, error: error.message });
  //   }
  // });

app.listen(9001,()=>(
    console.log("Crewmate Server Started.....")
))





  // app.post('/api/v1/webhook', async (req, res) => {
  //   try {
  //     // 1. Verify webhook signature
  //     const signature = req.headers['x-razorpay-signature'];
  //     const expectedSignature = crypto
  //       .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
  //       .update(JSON.stringify(req.body))
  //       .digest('hex');
  
  //     if (expectedSignature !== signature) {
  //       console.log('❌ Invalid webhook signature');
  //       return res.status(400).json({ 
  //         success: false, 
  //         message: 'Invalid signature' 
  //       });
  //     }
  
  //     const event = req.body;
  //     console.log('📨 Webhook Received:', event.event);           
  
  //     // 2. Check if it's subscription.activated
  //     if (event.event === 'subscription.activated') {
  //       // ✅ JUST CONSOLE LOG - NO TENANT CREATION
  //       console.log('🎉🎉🎉 SUBSCRIPTION ACTIVATED! 🎉🎉🎉');
        
  //       const subscription = event.payload.subscription.entity;
        
  //       console.log('📋 Subscription Details:');
  //       console.log('   Subscription ID:', subscription.id);
  //       console.log('   Customer ID:', subscription.customer_id);
  //       console.log('   Plan ID:', subscription.plan_id);
  //       console.log('   Status:', subscription.status);
  //       console.log('   Start Date:', new Date(subscription.start_at * 1000));
  //       console.log('   End Date:', subscription.end_at ? new Date(subscription.end_at * 1000) : 'N/A');
        
  //       // You can also log the full data if needed
  //       // console.log('Full Data:', JSON.stringify(subscription, null, 2));
        
  //       console.log('✅ Webhook processed - Subscription is active!');
  //       console.log('=============================================');
  //     }
  
  //     // 3. Always return 200 to acknowledge
  //     res.status(200).json({ 
  //       success: true, 
  //       received: true,
  //       message: 'Webhook received successfully'
  //     });
  
  //   } catch (error) {
  //     console.error('❌ Webhook Error:', error.message);
  //     // Still return 200 to avoid retries
  //     res.status(200).json({ 
  //       success: false, 
  //       error: error.message 
  //     });
  //   }
  // });
