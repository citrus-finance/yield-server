const sdk = require('@defillama/sdk');
const { default: BigNumber } = require('bignumber.js');

const utils = require('../utils');

const abi = require('./abi.json');

async function fetchVaultsApy(chainName, block, vaultConfig) {
  const { output: vaults } = await sdk.api.abi.call({
    target: vaultConfig.lens,
    abi: abi.getVaultsMetadata,
    chain: chainName,
    block,
    params: [vaultConfig.vaults.map((x) => x.address)],
  });

  const { pricesByAddress } = await utils.getPrices(
    vaults.map((x) => `${chainName}:${x.asset}`)
  );

  return vaults.map((vault, i) => ({
    pool: `citrus-${chainName}${vaultConfig.vaults[i].address}`,
    chain: utils.formatChain(chainName),
    project: 'citrus',
    symbol: utils.formatSymbol(vaultConfig.vaults[i].asset.symbol),
    tvlUsd:
      pricesByAddress[vault.asset.toLowerCase()] * Number(vault.totalAssets),
    apyBase: Number(vault.apy) / 10 ** 18,
  }));
}

const chains = ['xdai'];

async function fetchApy(timestamp = null) {
  return (
    await Promise.all(
      chains.map(async (chainName) => {
        const block = await (async () => {
          if (timestamp) {
            const [b] = await utils.getBlocksByTime([timestamp], chainName);
            return b;
          }

          const b = await sdk.api.util.getLatestBlock(chainName);
          return b.number;
        })();

        const chainConfig = await utils.getData(
          `https://citrus-finance.github.io/citrus-ecosystem/output/${chainName}.json`
        );

        return fetchVaultsApy(chainName, block, chainConfig.vault);
      })
    )
  ).flat();
}

module.exports = {
  timetravel: true,
  apy: fetchApy,
  url: 'https://app.citrus.finance/vaults',
};
