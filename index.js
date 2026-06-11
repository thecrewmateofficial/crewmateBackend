const express = require("express")
const app = express()
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const jwt = require("jsonwebtoken");
app.use(express.json())

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

  

app.listen(9001,()=>(
    console.log("Crewmate Server Started.....")
))