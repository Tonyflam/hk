import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🚀 Deploying NEXUS-402 Protocol to Cronos...");
  console.log("📍 Deployer:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "CRO");
  console.log("");

  // USDC.e on Cronos Testnet
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x8f4ae4b0a4e8fac07ab521c0d13e26400fe1ce1a";
  
  console.log("📦 Using USDC.e at:", USDC_ADDRESS);
  console.log("");

  // 1. Deploy NexusRegistry
  console.log("1️⃣ Deploying NexusRegistry...");
  const NexusRegistry = await ethers.getContractFactory("NexusRegistry");
  const registry = await NexusRegistry.deploy(USDC_ADDRESS);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("   ✅ NexusRegistry deployed at:", registryAddress);

  // 2. Deploy WorkflowEngine
  console.log("2️⃣ Deploying WorkflowEngine...");
  const WorkflowEngine = await ethers.getContractFactory("WorkflowEngine");
  const workflowEngine = await WorkflowEngine.deploy(registryAddress, USDC_ADDRESS);
  await workflowEngine.waitForDeployment();
  const workflowAddress = await workflowEngine.getAddress();
  console.log("   ✅ WorkflowEngine deployed at:", workflowAddress);

  // 3. Deploy PaymentRouter
  console.log("3️⃣ Deploying PaymentRouter...");
  const PaymentRouter = await ethers.getContractFactory("PaymentRouter");
  const paymentRouter = await PaymentRouter.deploy(USDC_ADDRESS);
  await paymentRouter.waitForDeployment();
  const paymentRouterAddress = await paymentRouter.getAddress();
  console.log("   ✅ PaymentRouter deployed at:", paymentRouterAddress);

  // 4. Deploy AgentMarketplace
  console.log("4️⃣ Deploying AgentMarketplace...");
  const AgentMarketplace = await ethers.getContractFactory("AgentMarketplace");
  const marketplace = await AgentMarketplace.deploy(USDC_ADDRESS);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("   ✅ AgentMarketplace deployed at:", marketplaceAddress);

  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("🎉 NEXUS-402 Protocol Deployment Complete!");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
  console.log("📋 Contract Addresses:");
  console.log("   NexusRegistry:    ", registryAddress);
  console.log("   WorkflowEngine:   ", workflowAddress);
  console.log("   PaymentRouter:    ", paymentRouterAddress);
  console.log("   AgentMarketplace: ", marketplaceAddress);
  console.log("");
  console.log("🔗 Verify on Cronos Explorer:");
  console.log(`   https://explorer.cronos.org/testnet/address/${registryAddress}`);
  console.log("");

  // Save deployment addresses
  const deploymentInfo = {
    network: "cronos-testnet",
    chainId: 338,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      NexusRegistry: registryAddress,
      WorkflowEngine: workflowAddress,
      PaymentRouter: paymentRouterAddress,
      AgentMarketplace: marketplaceAddress,
    },
    dependencies: {
      USDC: USDC_ADDRESS,
    }
  };

  console.log("📄 Deployment Info (copy to apps/backend/.env):");
  console.log(`NEXUS_REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`WORKFLOW_ENGINE_ADDRESS=${workflowAddress}`);
  console.log(`PAYMENT_ROUTER_ADDRESS=${paymentRouterAddress}`);
  console.log(`AGENT_MARKETPLACE_ADDRESS=${marketplaceAddress}`);
  console.log(`USDC_ADDRESS=${USDC_ADDRESS}`);

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
