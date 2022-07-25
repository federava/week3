// [bonus] implement an example game from part d
pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/comparators.circom";
include "../../node_modules/circomlib/circuits/bitify.circom";
include "../../node_modules/circomlib/circuits/poseidon.circom";
include "../../node_modules/circomlib/circuits/mux1.circom";

template GuessWho(n) {
    // Guess
    // The trait the player is asking about.
    signal input pubTrait;
    // The option of the trait the player is asking for.
    signal input pubTraitStyle;
    // Part of the setup of the game: the amount of different options for each trait.
    signal input pubTraitCap[n];
    // Whether or not the player is asking for the Id.
    signal input pubIdQuestion;
    // The id that the player wants to ask for.
    signal input pubId;
    // The hash of the solution.
    signal input pubSolnHash;

    // The trait options of the character of the solution.
    signal input privSolnTraits[n];
    // The id of the character of the solution.
    signal input privSolnId;
    // Private salt to prevent brute-force.
    signal input privSalt;

    // The hash of the solution.
    signal output solnHashOut;
    // The response for the question.
    signal output response;
    
    var equalCount = 0;

    // Constraint to check that the trait being asked (0 index) is less than the amount of traits.
    component pubTraitSize = LessThan(4);
    pubTraitSize.in[0] <== pubTrait;
    pubTraitSize.in[1] <== n;
    pubTraitSize.out === 1;

    var i=0;
    // Constraints and comparisson between the trait option chosen by the player with the solution.
    component lessThanPriv[n];
    component lessThanPub[n];
    component equalTrait[n];
    component equalTraitStyle[n];
    for(i=0; i<n; i++) {
        // Constraint for checking that the solution is in the range of the traits of the defined game
        lessThanPriv[i] = LessThan(4);
        lessThanPriv[i].in[0] <== privSolnTraits[i];
        lessThanPriv[i].in[1] <== pubTraitCap[i];
        lessThanPriv[i].out === 1;

        // This check is used to select from all the possible traits, the one that the player is asking.
        equalTrait[i] = IsEqual();
        equalTrait[i].in[0] <== pubTrait;
        equalTrait[i].in[1] <== i; // If they are equal, it outputs 1, if not 0

        // Checks that the trait being compares is less than the cap for that specific trait.
        lessThanPub[i] = LessThan(4);
        lessThanPub[i].in[0] <== pubTraitStyle * equalTrait[i].out;
        lessThanPub[i].in[1] <== pubTraitCap[i] * equalTrait[i].out;
        lessThanPub[i].out === equalTrait[i].out;

        // Here all the traits that are different from the one that the player is asking for are compared and always output 1 because it if forcer to compare 0 with 0.
        equalTraitStyle[i] = IsEqual();
        equalTraitStyle[i].in[0] <== pubTraitStyle * equalTrait[i].out;
        equalTraitStyle[i].in[1] <== privSolnTraits[i] * equalTrait[i].out;
        // The count will accumulate zeros if the comparisson is equal, and only sum 1 in case the comparisson of the question trait is different.
        equalCount += (1 - equalTraitStyle[i].out);
    }

    // Constraint that the guessing trait is in the solution traits, and that it is only one.
    equalCount * (1 - equalCount) === 0;
    // If the output is 1 it means that the question asked is equal to the solution. If it is zero, the trait option is not the asked.

    // Constraint: If pubIdQuestion is 1 the player is asking for identity of the character, if it is 0, he is asking for the characteristic.
    pubIdQuestion * (1 - pubIdQuestion) === 0;

    // Compare the Id the player inputs with the Id from the solution.
    component equalId = IsEqual();
    equalId.in[0] <== pubId;
    equalId.in[1] <== privSolnId;

    // The Mux component will output 
    component question = Mux1();
    question.c[0] <== (1 - equalCount);
    question.c[1] <== equalId.out;
    question.s <== pubIdQuestion;

    response <== question.out;

    component poseidon = Poseidon(n+2);
        
    var z = 0;
    // The solution hash is made of all the traits of the character, the private salt, and the id of the character.
    for(z=0; z<n; z++) {
        poseidon.inputs[z] <== privSolnTraits[z];
    }
    poseidon.inputs[n] <== privSalt;
    poseidon.inputs[n+1] <== privSolnId;

    solnHashOut <== poseidon.out;
    pubSolnHash === solnHashOut;
 }

 component main {public [pubTrait, pubTraitStyle, pubTraitCap, pubIdQuestion, pubId, pubSolnHash]} = GuessWho(5);