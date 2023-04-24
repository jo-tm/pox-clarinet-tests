import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";
import {
  Account,
  Chain,
  Clarinet,
  Tx,
  types,
} from "https://deno.land/x/clarinet@v1.5.4/index.ts";

Clarinet.test({
  name: "stack-stx: successfully lock STX",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const sender = accounts.get("wallet_1")!;
    const initialAmount = 50000;
    const startBurnHeight = 10;
    const lockPeriod = 10;

    let block = chain.mineBlock([
      Tx.contractCall(
        "pox-2",
        "stack-stx",
        [
          types.uint(initialAmount),
          types.tuple({
            version: types.buff(Uint8Array.from([5])),
            hashbytes: types.buff(
              Uint8Array.from([
                1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
              ])
            ),
          }),
          types.uint(startBurnHeight),
          types.uint(lockPeriod),
        ],
        sender.address
      ),
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk();
  },
});

Clarinet.test({
  name: "stack-stx: already stacking user cannot stack again",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const sender = accounts.get("wallet_1")!;
    const initialAmount = 50000;
    const startBurnHeight = 10;
    const lockPeriod = 10;

    // First stack operation
    let block = chain.mineBlock([
      Tx.contractCall(
        "pox-2",
        "stack-stx",
        [
          types.uint(initialAmount),
          types.tuple({
            version: types.buff(Uint8Array.from([5])),
            hashbytes: types.buff(
              Uint8Array.from([
                1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
              ])
            ),
          }),
          types.uint(startBurnHeight),
          types.uint(lockPeriod),
        ],
        sender.address
      ),
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk();

    // Second stack operation (attempting to stack again)
    block = chain.mineBlock([
      Tx.contractCall(
        "pox-2",
        "stack-stx",
        [
          types.uint(initialAmount),
          types.tuple({
            version: types.buff(Uint8Array.from([5])),
            hashbytes: types.buff(
              Uint8Array.from([
                1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
              ])
            ),
          }),
          types.uint(startBurnHeight),
          types.uint(lockPeriod),
        ],
        sender.address
      ),
    ]);

    assertEquals(block.receipts.length, 1);
    let ERR_STACKING_ALREADY_STACKED = 3;
    block.receipts[0].result
      .expectErr()
      .expectInt(ERR_STACKING_ALREADY_STACKED);
  },
});

Clarinet.test({
  name: "stack-stx: user with insufficient funds cannot stack",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const sender = accounts.get("wallet_1")!;
    const initialAmount = 100000000; // An amount greater than the user's balance
    const startBurnHeight = 10;
    const lockPeriod = 10;

    let block = chain.mineBlock([
      Tx.contractCall(
        "pox-2",
        "stack-stx",
        [
          types.uint(initialAmount),
          types.tuple({
            version: types.buff(Uint8Array.from([5])),
            hashbytes: types.buff(
              Uint8Array.from([
                1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
              ])
            ),
          }),
          types.uint(startBurnHeight),
          types.uint(lockPeriod),
        ],
        sender.address
      ),
    ]);

    assertEquals(block.receipts.length, 1);
    let ERR_STACKING_INSUFFICIENT_FUNDS = 1;
    block.receipts[0].result
      .expectErr()
      .expectInt(ERR_STACKING_INSUFFICIENT_FUNDS);
  },
});

Clarinet.test({
  name: "stack-stx: user with invalid start burn height cannot stack",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const sender = accounts.get("wallet_1")!;
    const initialAmount = 50000;
    const invalidStartBurnHeight = 9999; // An invalid start burn height
    const lockPeriod = 10;

    let block = chain.mineBlock([
      Tx.contractCall(
        "pox-2",
        "stack-stx",
        [
          types.uint(initialAmount),
          types.tuple({
            version: types.buff(Uint8Array.from([5])),
            hashbytes: types.buff(
              Uint8Array.from([
                1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
              ])
            ),
          }),
          types.uint(invalidStartBurnHeight),
          types.uint(lockPeriod),
        ],
        sender.address
      ),
    ]);

    assertEquals(block.receipts.length, 1);
    let ERR_INVALID_START_BURN_HEIGHT = 24;
    block.receipts[0].result
      .expectErr()
      .expectInt(ERR_INVALID_START_BURN_HEIGHT);
  },
});

Clarinet.test({
  name: "stack-stx: user who is already delegating cannot stack",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const sender = accounts.get("wallet_1")!;
    const delegate = accounts.get("wallet_2")!;
    const initialAmount = 50000;
    const startBurnHeight = 10;
    const lockPeriod = 10;

    // Delegate operation
    let block = chain.mineBlock([
      Tx.contractCall(
        "pox-2",
        "delegate-stx",
        [
          types.uint(initialAmount),
          types.principal(delegate.address),
          types.none(),
          types.none(),
        ],
        sender.address
      ),
    ]);

    assertEquals(block.receipts.length, 1);
    block.receipts[0].result.expectOk();

    // Attempt to stack after delegating
    block = chain.mineBlock([
      Tx.contractCall(
        "pox-2",
        "stack-stx",
        [
          types.uint(initialAmount),
          types.tuple({
            version: types.buff(Uint8Array.from([5])),
            hashbytes: types.buff(
              Uint8Array.from([
                1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
              ])
            ),
          }),
          types.uint(startBurnHeight),
          types.uint(lockPeriod),
        ],
        sender.address
      ),
    ]);

    assertEquals(block.receipts.length, 1);
    let ERR_STACKING_ALREADY_DELEGATED = 20;
    block.receipts[0].result
      .expectErr()
      .expectInt(ERR_STACKING_ALREADY_DELEGATED);
  },
});