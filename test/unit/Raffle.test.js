const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const {developmentChains, networkConfig} = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

!developmentChains.includes(network.name) ? describe.skip :describe("Raffle Unit Tests", async function(){
    let raffle, vrfCoordinatorV2Mock,deployer,interval
    const chainId = network.config.chainId

    beforeEach(async function(){
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(["all"])
        raffle = await ethers.getContract("Raffle", deployer)
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock",deployer)
        raffleEntranceFee = await raffle.getEntranceFee()
        interval = await raffle.getInterval()
    })

    describe("constructore", async function(){
        it("initializes the raffle correctly", async function (){
            const raffleState = await raffle.getRaffleState()
            assert.equal(raffleState.toString(), "0")
            assert.equal(interval.toString(),networkConfig[chainId]["interval"])
        })
    })

    describe("enterRaffle",async function(){
        it("reverts when you don't pay enough", async function () {
            await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(
                raffle,
                "Raffle__NotEnoughETHEntered",
            )
        })

        it("Records player when they entered", async function(){
            await raffle.enterRaffle({value: raffleEntranceFee})
            const playerFromContract = await raffle.getPlayer(0)
            assert.equal(playerFromContract,deployer)
        })

        it("emits event on enter", async function (){
            await expect(raffle.enterRaffle({value: raffleEntranceFee})).to.emit(raffle,"RaffleEnter")
        })

        it("dosent allow entrance when raffle is calculating",async function(){
            await raffle.enterRaffle({value: raffleEntranceFee})
            await network.provider.send("evm_increaseTime",[Number(interval) + 1])
            await network.provider.send("evm_mine",[])
            await raffle.performUpkeep("0x")
            await expect(raffle.enterRaffle({value:raffleEntranceFee})).to.be.revertedWithCustomError(raffle,"Raffle__NotOpen")
        })

    })

    describe("checkUpKeep",async function(){
        it("returns false if people haven't sent any ETH", async function () {
            await network.provider.send("evm_increaseTime", [Number(interval) + 1])
            await network.provider.send("evm_mine", [])
            const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
            assert(!upkeepNeeded)
        })
    })
})