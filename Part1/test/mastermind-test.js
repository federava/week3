//[assignment] write your own unit test to show that your Mastermind variation circuit is working as expected
const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { groth16, plonk } = require("snarkjs");

const wasm_tester = require("circom_tester").wasm;

const F1Field = require("ffjavascript").F1Field;
const Scalar = require("ffjavascript").Scalar;
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Fr = new F1Field(exports.p);

describe.only("Number Mastermind", function () {
    this.timeout(100000000);
    let Verifier;
    let verifier;
    // Random manually generated salt
    const privateSalt = 531456513456134567415567415674611111120;
    const hash = 9172162290037830823534947175063890085191881040735220027350888116163374091685n;
    let INPUT = {
        // Codebreaker is guessing 1234 and the code is 1234.
        "pubGuessA": 1,
        "pubGuessB": 2,
        "pubGuessC": 3,
        "pubGuessD": 4,
        // This should give one hit (number 1) and two blows (numbers 2 and 4).
        "pubNumHit": 4,
        "pubNumBlow": 0,
        // This is the public solution hash that is specific for this given solution (5412) and the private salt (531456513456134567415567415674611111120)
        "pubSolnHash": hash,
        // No extra clues where given (pubCheckDS equals 0)
        "pubDigitSum": 0,
        "pubCheckDS": 0,
        // Solution is 1234
        "privSolnA": 1,
        "privSolnB": 2,
        "privSolnC": 3,
        "privSolnD": 4,
        "privSalt": privateSalt,
    }

    beforeEach(async function () {
        Verifier = await ethers.getContractFactory("MastermindVariationVerifier");
        verifier = await Verifier.deploy();
        await verifier.deployed();
    });

    describe("No clues given to the codebreaker", async () => {
        it("Complete guess should pass with four number of hits without failing.", async function () {
            const circuit = await wasm_tester("contracts/circuits/MastermindVariation.circom");
            
            const witness = await circuit.calculateWitness(INPUT, true);

            assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
            assert(Fr.eq(Fr.e(witness[1]),Fr.e(hash)));
        });

        it("Partial guess with two hits and two blows should pass without failing.", async function () {
            const circuit = await wasm_tester("contracts/circuits/MastermindVariation.circom");
            
            INPUT = {
                ...INPUT,
                "pubGuessC": 0,
                "pubGuessD": 5,
                "pubNumHit": 2,
                "pubNumBlow": 0,
            }

            const witness = await circuit.calculateWitness(INPUT, true);

            assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
            assert(Fr.eq(Fr.e(witness[1]),Fr.e(hash)));
        });

        it("Partial guess with zero hits and two blows should pass without failing.", async function () {
            const circuit = await wasm_tester("contracts/circuits/MastermindVariation.circom");

            INPUT = {
                ...INPUT,
                "pubGuessA": 0,
                "pubGuessB": 1,
                "pubGuessC": 2,
                "pubGuessD": 5,
                "pubNumHit": 0,
                "pubNumBlow": 2,
            }

            const witness = await circuit.calculateWitness(INPUT, true);

            assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
            assert(Fr.eq(Fr.e(witness[1]),Fr.e(hash)));
        });
    })

    describe("Clue of sum of digits given to the codebreaker", async () => {
        it("Complete guess should pass with four number of hits without failing.", async function () {
            const circuit = await wasm_tester("contracts/circuits/MastermindVariation.circom");
            
            INPUT = {
                ...INPUT,
                "pubDigitSum": 10,
                "pubCheckDS": 1,
            }

            const witness = await circuit.calculateWitness(INPUT, true);

            assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
            assert(Fr.eq(Fr.e(witness[1]),Fr.e(hash)));
        });

        it("Partial guess with two hits and two blows should pass without failing.", async function () {
            const circuit = await wasm_tester("contracts/circuits/MastermindVariation.circom");
            
            INPUT = {
                ...INPUT,
                "pubGuessA": 1,
                "pubGuessB": 2,
                "pubGuessC": 0,
                "pubGuessD": 5,
                "pubNumHit": 2,
                "pubNumBlow": 0,
                "pubDigitSum": 10,
                "pubCheckDS": 1,
            }

            const witness = await circuit.calculateWitness(INPUT, true);

            assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
            assert(Fr.eq(Fr.e(witness[1]),Fr.e(hash)));
        });

        it("Partial guess with zero hits and two blows should pass without failing.", async function () {
            const circuit = await wasm_tester("contracts/circuits/MastermindVariation.circom");
            
            INPUT = {
                ...INPUT,
                "pubGuessA": 0,
                "pubGuessB": 1,
                "pubGuessC": 2,
                "pubGuessD": 5,
                "pubNumHit": 0,
                "pubNumBlow": 2,
                "pubDigitSum": 10,
                "pubCheckDS": 1,
            }

            const witness = await circuit.calculateWitness(INPUT, true);

            assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
            assert(Fr.eq(Fr.e(witness[1]),Fr.e(hash)));
        });
    })

    describe("Error testing", async () => {
        it("Wrong clue should produce an assert to fail.", async function () {
            const circuit = await wasm_tester("contracts/circuits/MastermindVariation.circom");
    
            INPUT = {
                ...INPUT,
                "pubGuessA": 1,
                "pubGuessB": 2,
                "pubGuessC": 0,
                "pubGuessD": 5,
                "pubNumHit": 2,
                "pubNumBlow": 0,
                "pubDigitSum": 14,
                "pubCheckDS": 1,
            }

            let witness
            let error

            try {
                witness = await circuit.calculateWitness(INPUT, true)
            } catch (e) {
                error = e.message
            }

            assert(error.includes("Error: Assert Failed. Error in template MastermindVariation"));
        });

        it("Wrong number of hits or blows should produce an assert to fail.", async function () {
            const circuit = await wasm_tester("contracts/circuits/MastermindVariation.circom");
    
            INPUT = {
                ...INPUT,
                "pubGuessA": 1,
                "pubGuessB": 2,
                "pubGuessC": 0,
                "pubGuessD": 5,
                "pubNumHit": 0,
                "pubNumBlow": 0,
            }

            let witness
            let error

            try {
                witness = await circuit.calculateWitness(INPUT, true)
            } catch (e) {
                error = e.message
            }

            assert(error.includes("Error: Assert Failed. Error in template MastermindVariation"));
        });

        it("Numbers bigger than 5 should produce an assert to fail.", async function () {
            const circuit = await wasm_tester("contracts/circuits/MastermindVariation.circom");
            
            // Random manually generated salt
            const privateSalt = 531456513456134567415567415674611111120;
            const hash = 9172162290037830823534947175063890085191881040735220027350888116163374091685n;
    
            INPUT = {
                ...INPUT,
                "pubGuessA": 6,
                "pubGuessB": 2,
                "pubGuessC": 0,
                "pubGuessD": 5,
                "pubNumHit": 1,
                "pubNumBlow": 0,
            }

            let witness
            let error

            try {
                witness = await circuit.calculateWitness(INPUT, true)
            } catch (e) {
                error = e.message
            }

            assert(error.includes("Error: Assert Failed. Error in template MastermindVariation"));
        });

        it("Repeating numbers should produce an assert to fail.", async function () {
            const circuit = await wasm_tester("contracts/circuits/MastermindVariation.circom");
    
            INPUT = {
                ...INPUT,
                "pubGuessA": 2,
                "pubGuessB": 2,
                "pubGuessC": 0,
                "pubGuessD": 5,
                "pubNumHit": 1,
                "pubNumBlow": 0,
            }

            let witness
            let error

            try {
                witness = await circuit.calculateWitness(INPUT, true)
            } catch (e) {
                error = e.message
            }

            assert(error.includes("Error: Assert Failed. Error in template MastermindVariation"));
        });

        it("Wrong solution hash should produce an assert to fail.", async function () {
            const circuit = await wasm_tester("contracts/circuits/MastermindVariation.circom");

            const hash = 9999999999999999999999999999999999999999999999999999999999999999999999999999n;
            
            INPUT = {
                ...INPUT,
                "pubSolnHash": hash,
            }

            let witness
            let error

            try {
                witness = await circuit.calculateWitness(INPUT, true)
            } catch (e) {
                error = e.message
            }

            assert(error.includes("Error: Assert Failed. Error in template MastermindVariation"));
        });

        it("Both wrong salt or solutions should produce an assert to fail.", async function () {
            const circuit = await wasm_tester("contracts/circuits/MastermindVariation.circom");
            
            const privateSalt = 999999999999999999999999999999999999999;
            
            INPUT = {
                ...INPUT,
                "privSalt": privateSalt,
            }

            let witness
            let error

            try {
                witness = await circuit.calculateWitness(INPUT, true)
            } catch (e) {
                error = e.message
            }

            assert(error.includes("Error: Assert Failed. Error in template MastermindVariation"));
        });

        it("Wrong pubCheckDS should produce an assert to fail.", async function () {
            const circuit = await wasm_tester("contracts/circuits/MastermindVariation.circom");
            
            INPUT = {
                ...INPUT,
                "pubCheckDS": 2,
            }

            let witness
            let error

            try {
                witness = await circuit.calculateWitness(INPUT, true)
            } catch (e) {
                error = e.message
            }

            assert(error.includes("Error: Assert Failed. Error in template MastermindVariation"));
        });
    })
});