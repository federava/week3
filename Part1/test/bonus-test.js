// [bonus] unit test for bonus.circom
//[assignment] write your own unit test to show that your Mastermind variation circuit is working as expected
const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { groth16, plonk } = require("snarkjs");

const wasm_tester = require("circom_tester").wasm;

const F1Field = require("ffjavascript").F1Field;
const Scalar = require("ffjavascript").Scalar;
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Fr = new F1Field(exports.p);

describe("Guess Who", function () {
    this.timeout(100000000);
    let Verifier;
    let verifier;

    beforeEach(async function () {
        Verifier = await ethers.getContractFactory("BonusVerifier");
        verifier = await Verifier.deploy();
        await verifier.deployed();
    });
    /*
    Explanation:
    A player can ask two kind of questions: for the Id of the character or for a specific trait of the character. Both questions take one turn.
    When a player asks for a trait, he needs to specify the trait he wants to ask for and which style/attribute that trait has. E.g.: Trait 2 (hair color), and style 4 (blonde).

    INPUTs:
    pubTrait         The trait to be asked. It is the possition counting from 0 in the list of traits from the solution.
    pubTraitStyle    The style of the trait to be asked. It is going to be compared with the solution which possition is the same as the pubTrait.
    pubTraitCap      Part of the public setting of the game. For example trait 2 (hair color) has 4 styles (blonde, brown, black, red), so the cap is 4. The number should be 0, 1, 2 or 3, that is, smaller than 4.
    pubIdQuestion    If 1, the player is asking for the Id of the character. If 0, the player is asking for a specific trait of the character.
    pubId            The Id of the character to be asked.
    pubSolnHash      The hash of all the solution traits, the id, and the salt.
    privSolnTraits   The traits of the character in the solution.
    privSolnId       The Id of the character in the solution.
    privSalt         The salt used to protect the game from brute-force attacks.

    For the setting of this game, the players have chosen to use 5 traits for each player. That is represented in the length of both pubTraitCap and privSolnTraits.
    Also the id of the character is an arbitrary number, but in a more developed game that could be bounded to a specific number that could be shown to be part of a set via a merkle tree.

    */

    const pubSolnHash = 2540076255390157878124010020451967945274294794727665103319773740980541041804n
    const privSalt = 5681816187416548648

    let INPUT = {
        "pubTrait": 1,
        "pubTraitStyle": 2,
        "pubTraitCap": [2, 3, 2, 7, 5],
        "pubIdQuestion": 0,
        "pubId": 0,
        "pubSolnHash": pubSolnHash,
        "privSolnTraits": [1, 2, 0, 6, 3],
        "privSolnId": 23,
        "privSalt": privSalt,
    }

    describe("Player askes different questions to try to guess", async () => {
        it("Asking if the character has a trait he actually has should be correct and return 1", async function () {
            const circuit = await wasm_tester("contracts/circuits/bonus.circom");
            
            const witness = await circuit.calculateWitness(INPUT, true);

            assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
            assert(Fr.eq(Fr.e(witness[1]),Fr.e(pubSolnHash)));
            assert(Fr.eq(Fr.e(witness[2]),Fr.e(1)));
        });

        it("Asking if the character has another trait he actually has should be correct and return 1", async function () {
            const circuit = await wasm_tester("contracts/circuits/bonus.circom");
            
            const newINPUT = {
                ...INPUT,
                "pubTrait": 4,
                "pubTraitStyle": 3,
            }

            const witness = await circuit.calculateWitness(newINPUT, true);

            assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
            assert(Fr.eq(Fr.e(witness[1]),Fr.e(pubSolnHash)));
            assert(Fr.eq(Fr.e(witness[2]),Fr.e(1)));
        });

        it("Asking if the character has a trait he does not have should be correct and return 0", async function () {
            const circuit = await wasm_tester("contracts/circuits/bonus.circom");
            
            const newINPUT = {
                ...INPUT,
                "pubTraitStyle": 1,
            }

            const witness = await circuit.calculateWitness(newINPUT, true);

            assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
            assert(Fr.eq(Fr.e(witness[1]),Fr.e(pubSolnHash)));
            assert(Fr.eq(Fr.e(witness[2]),Fr.e(0)));
        });

        it("Asking if the character id is one that actually is should be correct and return 1", async function () {
            const circuit = await wasm_tester("contracts/circuits/bonus.circom");
            
            const newINPUT = {
                ...INPUT,
                "pubIdQuestion": 1,
                "pubId": 23,
            }

            const witness = await circuit.calculateWitness(newINPUT, true);

            assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
            assert(Fr.eq(Fr.e(witness[1]),Fr.e(pubSolnHash)));
            assert(Fr.eq(Fr.e(witness[2]),Fr.e(1)));
        });

        it("Asking if the character id is one that it is not should be correct and return 0", async function () {
            const circuit = await wasm_tester("contracts/circuits/bonus.circom");
            
            const newINPUT = {
                ...INPUT,
                "pubIdQuestion": 1,
                "pubId": 17,
            }

            const witness = await circuit.calculateWitness(newINPUT, true);

            assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
            assert(Fr.eq(Fr.e(witness[1]),Fr.e(pubSolnHash)));
            assert(Fr.eq(Fr.e(witness[2]),Fr.e(0)));
        });
    })

    describe("Errors ", async () =>{
        it("Asking for a trait that's not part of the game setting should revert.", async function () {
            const circuit = await wasm_tester("contracts/circuits/bonus.circom");
            
            const newINPUT = {
                ...INPUT,
                "pubTrait": 7,
            }

            let witness
            let error

            try {
                witness = await circuit.calculateWitness(newINPUT, true)
            } catch (e) {
                error = e.message
            }

            assert(error.includes("Error: Assert Failed. Error in template GuessWho"));
        });

        it("Asking for a style that is out of the cap should revert.", async function () {
            const circuit = await wasm_tester("contracts/circuits/bonus.circom");
            
            const newINPUT = {
                ...INPUT,
                "pubTraitStyle": 3,
            }

            let witness
            let error

            try {
                witness = await circuit.calculateWitness(newINPUT, true)
            } catch (e) {
                error = e.message
            }

            assert(error.includes("Error: Assert Failed. Error in template GuessWho"));
        });

        it("Providing a worng solution hash should revert.", async function () {
            const circuit = await wasm_tester("contracts/circuits/bonus.circom");
            
            const newINPUT = {
                ...INPUT,
                "pubSolnHash": 123456789,
            }

            let witness
            let error

            try {
                witness = await circuit.calculateWitness(newINPUT, true)
            } catch (e) {
                error = e.message
            }

            assert(error.includes("Error: Assert Failed. Error in template GuessWho"));
        });

        it("Providing a wrong solution trait should revert.", async function () {
            const circuit = await wasm_tester("contracts/circuits/bonus.circom");
            
            const newINPUT = {
                ...INPUT,
                "privSolnTraits": [0, 2, 0, 6, 3],
            }

            let witness
            let error

            try {
                witness = await circuit.calculateWitness(newINPUT, true)
            } catch (e) {
                error = e.message
            }

            assert(error.includes("Error: Assert Failed. Error in template GuessWho"));
        });

        it("Providing a wrong solution id should revert.", async function () {
            const circuit = await wasm_tester("contracts/circuits/bonus.circom");
            
            const newINPUT = {
                ...INPUT,
                "privSolnId": 5,
            }

            let witness
            let error

            try {
                witness = await circuit.calculateWitness(newINPUT, true)
            } catch (e) {
                error = e.message
            }

            assert(error.includes("Error: Assert Failed. Error in template GuessWho"));
        });
    })
});