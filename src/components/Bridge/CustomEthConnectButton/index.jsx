import React from "react";
import { Button } from "@mui/material";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { get as _get } from "lodash";

const CustomEthConnectButton = (props) => {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        // Note: If your app doesn"t use authentication, you
        // can remove all "authenticationStatus" checks
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === "authenticated");

        return (
          <div
            style={connected || _get(chain, "unsupported", false) ? {} : { width: "100%" }}
            {...(!ready && {
              "aria-hidden": true,
              "style": {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <Button variant="contained" sx={{ width: "100%" }} onClick={openConnectModal} type="button">
                    Connect
                  </Button>
                );
              }

              if (chain.unsupported) {
                return (
                  <Button variant="contained" sx={{ width: "100%" }} onClick={openChainModal} type="button">
                    Wrong network
                  </Button>
                );
              }

              return (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", gap: 12 }}>
                    <Button
                      onClick={openChainModal}
                      style={{ display: "flex", alignItems: "center" }}
                      type="button"
                    >
                      {chain.hasIcon && (
                        <div
                          style={{
                            background: chain.iconBackground,
                            width: 12,
                            height: 12,
                            borderRadius: 999,
                            overflow: "hidden",
                            marginRight: 4,
                          }}
                        >
                          {chain.iconUrl && (
                            <img
                              alt={chain.name ?? "Chain icon"}
                              src={chain.iconUrl}
                              style={{ width: 12, height: 12 }}
                            />
                          )}
                        </div>
                      )}
                      {chain.name}
                    </Button>

                    <Button onClick={openAccountModal} type="button">
                      {account.displayName}
                    </Button>
                  </div>
                  {props.actions}
                </>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>

  )
}

export default CustomEthConnectButton;