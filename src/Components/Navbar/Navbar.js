import React, {useEffect, useState} from 'react';
import { Grid } from 'semantic-ui-react';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import IconButton from '@material-ui/core/IconButton';
import AccountBoxIcon from '@material-ui/icons/AccountBox';
import { Auth } from "aws-amplify";
import { connect } from "react-redux";
import {updateLoginState} from "../../Actions/loginActions";
import "./Navbar.css";


function Navbar(props) {
    const {updateLoginState, loginState} = props;

    const [user, setUser] = useState("");

    useEffect(() => {
        async function retrieveUser() {
            try {
                const returnedUser = await Auth.currentAuthenticatedUser();
                setUser(returnedUser.attributes.email);
            } catch (e) {

            }
        }
        retrieveUser();
    }, [loginState])


    async function onSignOut() {
        updateLoginState("signIn");
        await Auth.signOut();
    }

        return(
            <Grid.Row className={"navbar-wrapper"}>
                <Grid.Column>
                    <Grid>
                        <Grid.Row className={"navbar-inner"} columns={2}>
                            <Grid.Column width={6} verticalAlign={"middle"} className={"navbar-column"} >
                                    <Grid>
                                        <Grid.Row>
                                            <Grid.Column width={7} textAlign={"center"} verticalAlign={"middle"}>
                                                <div className={"brand-wrapper"}>
                                                <span className={"brand-text"}>IBD<span className={"brand-text-divider"}>/</span>Centre</span>
                                                </div>
                                            </Grid.Column>
                                            <Grid.Column width={9} textAlign={"center"} verticalAlign={"middle"}>
                                            <img src={require('../../assets/images/PB_AWS_logo_RGB_stacked.png').default} className={"aws-image"} alt={"..."}/>
                                            </Grid.Column>
                                        </Grid.Row>
                                    </Grid>
                            </Grid.Column>
                            <Grid.Column width={5}>

                            </Grid.Column>
                            <Grid.Column style={{paddingRight: "5px"}} width={1} verticalAlign={"middle"} textAlign={"right"} className={"navbar-column"}>
                                <AccountBoxIcon fontSize={"large"} />
                            </Grid.Column>
                            <Grid.Column style={{paddingLeft: "0px"}} width={2} verticalAlign={"middle"} textAlign={"left"} className={"navbar-column"}>
                                {user}
                            </Grid.Column>
                            <Grid.Column width={2} verticalAlign={"middle"} className={"navbar-column-button"}>
                                <Grid>
                                    <Grid.Row style={{padding: "0px"}}>
                                        <Grid.Column style={{padding: "0px"}}>
                                            <IconButton
                                                className={"logout-button"}
                                                onClick={onSignOut}
                                            >
                                                <ExitToAppIcon className={"logout-button-icon"}/>
                                            </IconButton>
                                        </Grid.Column>
                                    </Grid.Row>
                                    <Grid.Row style={{padding: "0px"}}>
                                        <Grid.Column style={{padding: "0px"}}>
                                            <button
                                                className={"logout-text-button"}
                                                onClick={onSignOut}>
                                                <span className={"logout-text"}>Logout</span>
                                            </button>
                                        </Grid.Column>
                                    </Grid.Row>
                                </Grid>
                            </Grid.Column>
                        </Grid.Row>
                    </Grid>
                </Grid.Column>
            </Grid.Row>
        )

}

const mapStateToProps = (state) => {
    return {
        loginState: state.loginState.currentState,
    };
};

const mapDispatchToProps = {
    updateLoginState,
};

export default connect(mapStateToProps, mapDispatchToProps)(Navbar);