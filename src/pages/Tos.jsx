import React from "react";
import { Box, Typography, useTheme, Link } from "@mui/material";

const TermsOfService = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "80vh",
        background: `linear-gradient(to bottom right, ${theme.palette.primary.main}, ${theme.palette.background.light})`,
        borderRadius: "10px",
      }}
    >
      <Box
        sx={{
          flex: "1 0 auto",
          width: "90%",
          maxWidth: "1200px",
          margin: "2rem auto",
          padding: "2rem",
          backgroundColor: theme.palette.background.default,
          boxShadow: "0 0 20px rgba(0, 0, 0, 0.1)",
          borderRadius: "10px",
          overflowY: "auto",
          maxHeight: "calc(80vh - 8rem)",
          scrollbarWidth: '10px',
          scrollbarColor: `${theme.palette.primary.main} ${theme.palette.background.light}`,
          '::-webkit-scrollbar': {
            width: '10px',
          },
          '::-webkit-scrollbar-track': {
            background: theme.palette.background.light,
          },
          '::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.primary.main,
            borderRadius: '10px',
          },
        }}
      >
        <Typography
          variant="h4"
          sx={{
            color: theme.palette.primary.main,
            textAlign: "center",
            marginBottom: "1rem",
          }}
        >
          Terms of Service
        </Typography>
        <Box
          className="content"
          sx={{
            color: theme.palette.text.primary,
            fontSize: "1rem",
            lineHeight: 1.6,
          }}
        >
          <Typography
            variant="h5"
            sx={{
              color: theme.palette.secondary.main,
              marginTop: "2rem",
              marginBottom: "1rem",
            }}
          >
            Definitions
          </Typography>
          <Typography paragraph>
            1. "APIs": Application Programming Interfaces, which are sets of
            defined rules that enable different software systems to communicate
            with each other.
          </Typography>
          <Typography paragraph>
            2. "Blockchain": A decentralized, distributed ledger technology that
            records transactions across multiple computers within a network.
          </Typography>
          <Typography paragraph>
            3. "Blockchain Technology": The underlying technology and
            infrastructure that enables the existence and operation of
            blockchains.
          </Typography>
          <Typography paragraph>
            4. "Cryptocurrency": A digital or virtual currency that uses
            cryptography for security.
          </Typography>
          <Typography paragraph>
            5. "Digital Assets": Any digital representation of value, including
            but not limited to cryptocurrencies, tokens, and other digital
            currencies.
          </Typography>
          <Typography paragraph>
            6. "FDIC": The Federal Deposit Insurance Corporation, a US
            government agency that provides deposit insurance to protect
            depositors in case of bank failures.
          </Typography>
          <Typography paragraph>
            7. "Forks": Changes to the underlying protocol of a blockchain that
            result in the creation of a new blockchain, often with different
            rules or features.
          </Typography>
          <Typography paragraph>
            8. "Gas": A unit of measurement for the computational effort
            required to execute specific operations on a blockchain.
          </Typography>
          <Typography paragraph>
            9. "Private Key": A unique, secret code used to control access to a
            digital wallet and authorize transactions.
          </Typography>
          <Typography paragraph>
            10. "Public Blockchain": A blockchain that accessible to anyone,
            allowing anyone to participate in the network and view transactions.
          </Typography>
          <Typography paragraph>
            11. "Seed Phrase": A sequence of words used to restore access to a
            digital wallet in case the private key is lost.
          </Typography>
          <Typography paragraph>
            12. "Smart Contract": A self-executing program that automates
            specific rules or agreements when certain conditions are met,
            typically on a blockchain.
          </Typography>
          <Typography paragraph>
            13. "Token": A digital asset issued on a blockchain, often
            representing a particular asset, utility, or right.
          </Typography>
          <Typography paragraph>
            14. "Wallet": A digital container used to store, send, and receive
            digital assets, often secured by a private key or seed phrase.
          </Typography>
          <Typography paragraph>
            15. "Vortex": The company providing the Services, as defined in
            these Terms of Service.
          </Typography>

          <Typography
            variant="h5"
            sx={{
              color: theme.palette.secondary.main,
              marginTop: "2rem",
              marginBottom: "1rem",
            }}
          >
            Services
          </Typography>
          <Typography paragraph>
            The Services allow users ("Users") to interface with a set of
            decentralized, open-sourced smart contracts that facilitate the
            bridging of funds and data between blockchains.
          </Typography>

          <Typography
            variant="h5"
            sx={{
              color: theme.palette.secondary.main,
              marginTop: "2rem",
              marginBottom: "1rem",
            }}
          >
            Wallets
          </Typography>
          <Typography paragraph>
            To use certain Services, Users may need to link a third-party
            digital wallet ("Wallet") with the Services. By using a Wallet in
            connection with the Services, Users agree that they are using the
            Wallet under the terms and conditions of the applicable third-party
            provider of such Wallet. Wallets are not associated with, maintained
            by, supported by, or affiliated with Vortex. Vortex accepts no
            responsibility or liability to Users in connection with their use of
            a Wallet and makes no representations and warranties regarding how
            the Services will operate with any specific Wallet. The private keys
            and/or seed phrases necessary to decrypt a Wallet are held solely by
            the User, and not by Vortex. Vortex has no ability to help Users
            access or recover their private keys and/or seed phrases for their
            Wallets, so Users must keep them in a safe place.
          </Typography>

          <Typography
            variant="h5"
            sx={{
              color: theme.palette.secondary.main,
              marginTop: "2rem",
              marginBottom: "1rem",
            }}
          >
            Fees and Taxes
          </Typography>
          <Typography paragraph>
            Vortex may charge or pass through fees for some or part of the
            Services made available to Users, including transaction or
            processing fees, blockchain gas or similar network fees. Vortex will
            disclose the amount of fees charged or passed through to Users for
            the applicable Service at the time they access, use, or otherwise
            transact with the Services. Although Vortex will attempt to provide
            accurate fee information, any such information reflects an estimate
            of fees, which may vary from the fees actually paid to use the
            Services and interact with the applicable blockchain. Additionally,
            Users' external Wallet providers may impose fees to transact on the
            Services. Vortex is not responsible for any fees charged by a third
            party. All transactions processed through the Services are
            non-refundable. Users will be responsible for paying any and all
            taxes, duties, and assessments now or hereafter claimed or imposed
            by any governmental authority associated with their use of the
            Services. In certain cases, Users' transactions through the Services
            may not be successful due to an error with the blockchain or the
            Wallet. Vortex accepts no responsibility or liability to Users for
            any such failed transactions or any transaction or gas fees that may
            be incurred by Users in connection with such failed transactions.
          </Typography>

          <Typography
            variant="h5"
            sx={{
              color: theme.palette.secondary.main,
              marginTop: "2rem",
              marginBottom: "1rem",
            }}
          >
            Assumption of Risks
          </Typography>
          <Typography paragraph>
            By using the Services, Users represent that they have sufficient
            knowledge and experience in business and financial matters,
            including a sufficient understanding of blockchain or cryptographic
            tokens and technologies and other digital assets, storage mechanisms
            (such as Wallets), blockchain-based software systems, and blockchain
            technology, to assess and evaluate the risks and benefits of the
            Services, and will bear the risks thereof, including loss of all
            amounts paid, and the risk that the tokens may have little or no
            value. Users acknowledge and agree that there are risks associated
            with purchasing and holding cryptocurrency and using blockchain
            technology, including but not limited to the risk of losing access
            to cryptocurrency due to loss of private key(s), custodial error or
            user error, risk of mining or blockchain attacks, risk of hacking
            and security weaknesses, risk of unfavorable regulatory intervention
            in one or more jurisdictions, risk related to token taxation, risk
            of personal information disclosure, risk of uninsured losses,
            volatility risks, and unanticipated risks.
          </Typography>

          <Typography
            variant="h5"
            sx={{
              color: theme.palette.secondary.main,
              marginTop: "2rem",
              marginBottom: "1rem",
            }}
          >
            Smart Contracts and Blockchain Technology
          </Typography>
          <Typography paragraph>
            Smart contracts execute automatically when certain conditions are
            met. Vortex does not have the ability to reverse a transaction
            recorded on a public blockchain. Users are responsible for ensuring
            that any details entered in connection with a transaction using any
            smart contracts are accurate and complete. Vortex is not responsible
            for any losses due to Users' errors, including incorrectly
            constructed transactions. Further, since smart contracts typically
            cannot be stopped or reversed, vulnerabilities in their programming
            and design or other vulnerabilities that may arise due to hacking or
            other security incidents can have adverse effects on digital assets,
            including but not limited to significant volatility and risk of
            loss.
          </Typography>
          <Typography paragraph>
            Users acknowledge that there are inherent risks associated with
            using or interacting with public blockchains and blockchain
            technology. There is no guarantee that such technology will be
            unavailable or subject to errors, hacking, or other security risks.
            Underlying blockchain protocols may also be subject to sudden
            changes in operating rules, including forks, and it is the
            responsibility of Users to make themselves aware of upcoming
            operating changes.
          </Typography>
          <Typography paragraph>
            Users acknowledge that cryptocurrencies and other similar digital
            assets are neither (i) deposits of or guaranteed by a bank nor (ii)
            insured by the FDIC or by any other governmental agency.
          </Typography>
          <Typography paragraph>
            The regulatory regime governing blockchain technologies,
            cryptocurrencies, and tokens is uncertain, and new regulations or
            policies may materially adversely affect the potential utility or
            value of tokens. There also exists the risk of new taxation on the
            purchase or sale of tokens.
          </Typography>

          <Typography
            variant="h5"
            sx={{
              color: theme.palette.secondary.main,
              marginTop: "2rem",
              marginBottom: "1rem",
            }}
          >
            Service Availability
          </Typography>
          <Typography paragraph>
            Vortex will use commercially reasonable efforts to maintain the
            availability of the Services. However, the Services may be subject
            to scheduled or unscheduled downtime for maintenance, upgrades, or
            other reasons. Vortex does not guarantee that the Services will be
            uninterrupted, error-free, or secure.
          </Typography>

          <Typography
            variant="h5"
            sx={{
              color: theme.palette.secondary.main,
              marginTop: "2rem",
              marginBottom: "1rem",
            }}
          >
            Modifications to Services
          </Typography>
          <Typography paragraph>
            Vortex reserves the right to modify, update, or discontinue the
            Services or any part thereof, including any APIs, software, or other
            features, at any time without prior notice or liability to you.
          </Typography>

          <Typography
            variant="h5"
            sx={{
              color: theme.palette.secondary.main,
              marginTop: "2rem",
              marginBottom: "1rem",
            }}
          >
            Submissions
          </Typography>
          <Typography paragraph>
            Users acknowledge and agree that any questions, comments,
            suggestions, ideas, feedback, or other information regarding Vortex
            ("Submissions") provided by them to Vortex shall become the sole
            property of Vortex. Vortex shall own the exclusive rights, including
            all intellectual property rights, and shall be entitled to the
            unrestricted use and dissemination of these Submissions for any
            lawful purpose, commercial or otherwise, without acknowledgment or
            compensation to Users. Users hereby waive all moral rights to any
            such Submissions, and Users hereby warrant that any such Submissions
            are original from them or that they have the right to submit such
            Submissions. Users agree there shall be no recourse against Vortex
            for any alleged or actual infringement or misappropriation of any
            proprietary right in their Submissions.
          </Typography>

          <Typography
            variant="h5"
            sx={{
              color: theme.palette.secondary.main,
              marginTop: "2rem",
              marginBottom: "1rem",
            }}
          >
            Intellectual Property
          </Typography>
          <Typography paragraph>
            All intellectual property rights, including copyrights, patents,
            trade secrets, trademarks, and other proprietary rights, in and to
            the Services and any related software, documentation, content, and
            materials provided by Vortex, shall remain the sole and exclusive
            property of Vortex or its licensors. Users shall not acquire any
            ownership interest in the Services or any related materials or
            intellectual property rights.
          </Typography>

          <Typography
            variant="h5"
            sx={{
              color: theme.palette.secondary.main,
              marginTop: "2rem",
              marginBottom: "1rem",
            }}
          >
            Third-Party Services and Links
          </Typography>
          <Typography paragraph>
            The Services may contain links to third-party websites, services, or
            resources. Vortex does not endorse or assume any responsibility for
            such third-party content, services, or resources. Your use of any
            third-party services is subject to their terms and policies.
          </Typography>

          <Typography
            variant="h5"
            sx={{
              color: theme.palette.secondary.main,
              marginTop: "2rem",
              marginBottom: "1rem",
            }}
          >
            Limitation of Liability
          </Typography>
          <Typography paragraph>
            In no event shall Vortex or its affiliates, directors, officers,
            employees, agents, or representatives be liable for any indirect,
            special, incidental, consequential, or punitive damages, including
            but not limited to lost profits, data loss, or other intangible
            losses, arising out of or in connection with the use or inability to
            use the Services, even if advised of the possibility of such
            damages.
          </Typography>

          <Typography
            variant="h5"
            sx={{
              color: theme.palette.secondary.main,
              marginTop: "2rem",
              marginBottom: "1rem",
            }}
          >
            Modification and Termination
          </Typography>
          <Typography paragraph>
            Vortex reserves the right to modify or terminate these Terms of Service
            at any time, with or without notice. Users' continued use of the
            Services after any such modifications shall constitute their
            acceptance of the modified Terms of Service.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default TermsOfService;
