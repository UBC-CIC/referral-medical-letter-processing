import {Grid, Button, Input, Image, Divider, Icon} from "semantic-ui-react";
import {Auth} from "aws-amplify";
import React, {useState, useEffect} from "react";
import { connect } from "react-redux";
import {updateLoginState} from "../../actions/loginActions";
import "./Login.css";


const initialFormState = {
    email: "", password: "", authCode: "", resetCode: "", formType: "signIn"
}

function Login(props) {
    const {loginState, updateLoginState, animateTitle, type, title, darkMode} = props;
    const [formState, updateFormState] = useState(initialFormState);
    const [accountCreationError, setAccountCreationError] = useState(false);
    const [accountLoginError, setAccountLoginError] = useState(false);
    const [verificationError, setVerificationError] = useState(false);
    const [newVerification, setNewVerification] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        updateFormState(() => ({...formState, formType: loginState}));
    }, [loginState])

    useEffect(() => {
        async function retrieveUser() {
            try {
                Auth.currentAuthenticatedUser().then(user => {
                    updateLoginState("signedIn");
                }).catch(err => {
                        updateLoginState("signIn");
                    })

            } catch (e) {

            }
        }
        retrieveUser();
    }, [loginState])

    function onChange(e) {
        e.persist();
        setAccountCreationError(false);
        setAccountLoginError(false);
        setVerificationError(false);
        setNewVerification(false);
        updateFormState(() => ({...formState, [e.target.name]: e.target.value}))
    }

    const {formType} = formState;

    async function signUp() {
        try {
            const {email, password} = formState;
            setLoading(true);
            await Auth.signUp({username: email, password: password, attributes: {email}});
            setLoading(false);
            updateLoginState("confirmSignUp");
        } catch (e) {
            setLoading(false);
            setAccountCreationError(true);
            console.log('error signing up:', e);
        }
    }

    async function confirmSignUp() {
        try {
            setNewVerification(false);
            const {email, authCode} = formState;
            setLoading(true);
            await Auth.confirmSignUp(email, authCode);
            updateLoginState("signedIn");
        } catch (e) {
            setVerificationError(true);
            setLoading(false);
            console.log('error confirming sign up:', e);
        }
    }

    async function resendConfirmationCode() {
        try {
            const {email} = formState;
            setVerificationError(false);
            await Auth.resendSignUp(email);
            setNewVerification(true);
        } catch (err) {
            setNewVerification(false);
            console.log('error resending code: ', err);
        }
    }

    async function signIn(){
        try {
            setLoading(true);
            const {email, password} = formState;
            await Auth.signIn(email, password);
            updateLoginState("signedIn");
            setLoading(false);
        } catch (e) {
            setAccountLoginError(true);
            setLoading(false);
        }
    }

    async function forgotPassword() {
        try {
            const {email} = formState;
            setLoading(true);
            await Auth.forgotPassword(email);
            setLoading(false);
            updateLoginState("resetPassword");
        } catch (e) {
            setLoading(false);
            updateLoginState("resetPassword");
        }
    }

    async function resetPassword() {
        try {
            const {email, resetCode, password} = formState;
            setLoading(true);
            await Auth.forgotPasswordSubmit(email, resetCode, password);
            setLoading(false);
            updateLoginState("signIn");
        } catch (e) {
            setLoading(false);
        }
    }

    let logoType = (darkMode)? "/Assets/Images/cic_logo_2020_inverse.png" : "/Assets/Images/cic_logo_2020.png";

    return (
        <Grid style={{width: "100vw", height: "100vh"}}>
            <Grid.Row style={{width: "100vw", height: "100vh"}}>
                {/*  An example image is provided. Please use a royalty-free photo, a photo owned by you, or a photo owned by the CIC */}
                <Grid.Column width={9} style={(type === "image")? { backgroundColor: "#012144", backgroundImage: "linear-gradient(rgba(255,255,255,0.5), rgba(255,255,255,0.5)), url(./Assets/Images/background.jpg)", backgroundSize: "cover", backgroundRepeat: "no", width: "100%", height: "100vh"} :
                    { backgroundColor: "#012144", width: "100%", height: "100vh"}
                }>
                    {/* Please use a royalty free video or a video that you or the CIC owns */}
                    {(type === "video")?
                        <video playsInline autoPlay muted loop>
                            <source src={process.env.PUBLIC_URL + "/Assets/Videos/video.mp4"} type="video/mp4" />
                        </video>
                        : null}
                    <Grid style={{width: "100%", height: "100%"}}>
                        <Grid.Row>
                            <Grid.Column textAlign={"center"} verticalAlign={"middle"} className={"typewriter"}>
                                    <h1 className={(animateTitle)? (darkMode)? "line anim-typewriter" : "line anim-typewriter-light lightMode" : (darkMode)? "line-static" : "line-static lightMode-static"}>{title}</h1>
                            </Grid.Column>
                        </Grid.Row>
                        <Grid.Row>
                            <Grid.Column width={1}/>
                            <Grid.Column width={15} textAlign={"center"} verticalAlign={"bottom"}>
                                <Image src={process.env.PUBLIC_URL + logoType} fluid/>
                            </Grid.Column>
                        </Grid.Row>
                    </Grid>
                </Grid.Column>
                <Grid.Column width={1} />
                <Grid.Column width={5} textAlign={"right"} verticalAlign={"middle"}>
                    <Grid style={{marginLeft: "3.00%"}}>
                        <Grid.Row>
                            <Grid.Column textAlign={"center"} verticalAlign={"middle"}>
                                <div className={"login-box"}>
                                    <Grid>
                                        <Grid.Row style={{padding: "0px"}}>
                                            <Grid.Column verticalAlign={"middle"} textAlign={"left"}>
                                                <div className={"login-wrapper-top"}>
                                                    <span className={"login-wrapper-top-header"}>{(formType === "signIn")? <span>Sign In</span> : (formType === "signUp")? <span>Sign Up</span> : (formType === "confirmSignUp")? <span>Verify Account</span> : (formType === "forgotPassword" || formType === "resetPassword")? <span>Password Reset</span> : <span>Welcome</span>}</span>
                                                </div>
                                            </Grid.Column>
                                        </Grid.Row>
                                        <Grid.Row>
                                            <Grid.Column verticalAlign={"middle"} textAlign={"center"}>
                                                {
                                                    formType === "signIn" && (
                                                        <Grid>
                                                            <Grid.Row style={{paddingTop: "3px", paddingBottom: "0px"}}>
                                                                <Grid.Column verticalAlign={"middle"} textAlign={"center"}>
                                                                    {(accountLoginError)? <span style={{color: "red"}}><Icon name={"warning sign"} style={{color: "orange"}}  /><strong>Incorrect username or password.</strong></span> : null}
                                                                </Grid.Column>
                                                            </Grid.Row>
                                                            <Grid.Row style={{paddingBottom: "0px"}}>
                                                                <Grid.Column verticalAlign={"middle"} textAlign={"center"} style={{paddingLeft: "30px", paddingRight: "30px"}}>
                                                                    <Input iconPosition={"left"} name={"email"} type={"email"} onChange={onChange} placeholder={"Email"} style={{maxWidth: "100%"}}
                                                                          error={(accountLoginError)} fluid>
                                                                        <Icon name={"at"} />
                                                                        <input />
                                                                    </Input>
                                                                </Grid.Column>
                                                            </Grid.Row>
                                                            <Grid.Row style={{paddingBottom: "0px"}}>
                                                                <Grid.Column verticalAlign={"middle"} textAlign={"center"} style={{paddingLeft: "30px", paddingRight: "30px"}}>
                                                                    <Input iconPosition={"left"} name={"password"} type={"password"} onChange={onChange} placeholder={"Password"} style={{maxWidth: "100%"}}
                                                                           error={(accountLoginError)} fluid>
                                                                        <Icon name={"key"} />
                                                                        <input />
                                                                    </Input>
                                                                </Grid.Column>
                                                            </Grid.Row>
                                                            <Grid.Row style={{padding: "0px"}}>
                                                                <Grid.Column verticalAlign={"middle"} textAlign={"right"}>
                                                                    <Button style={{backgroundColor: "transparent"}} size={"mini"}
                                                                    onClick={() => updateLoginState("forgotPassword")}
                                                                    >Forgot your password?</Button>
                                                                </Grid.Column>
                                                            </Grid.Row>
                                                            <Grid.Row style={{paddingBottom: "0px", paddingTop: "0px"}}>
                                                                <Grid.Column verticalAlign={"middle"} textAlign={"center"}>
                                                                    <Button onClick={signIn} animated={"vertical"} color={"blue"} loading={(loading)}>
                                                                        <Button.Content visible>
                                                                            Sign In
                                                                        </Button.Content>
                                                                        <Button.Content hidden>
                                                                            <Icon name={"arrow right"} />
                                                                        </Button.Content>
                                                                    </Button>
                                                                </Grid.Column>
                                                            </Grid.Row>
                                                            <Grid.Row style={{padding: "0px"}}>
                                                                <Grid.Column>
                                                                    <Divider />
                                                                </Grid.Column>
                                                            </Grid.Row>
                                                            <Grid.Row style={{paddingTop: "0px"}}>
                                                                <Grid.Column verticalAlign={"middle"} textAlign={"center"}>
                                                                    <Button icon labelPosition={"right"} onClick={() => updateLoginState("signUp")} size={"mini"}>
                                                                        Create an Account
                                                                        <Icon name={"right arrow"} />
                                                                    </Button>
                                                                </Grid.Column>
                                                            </Grid.Row>
                                                        </Grid>
                                                    )
                                                }
                                                {
                                                    formType === "forgotPassword" && (
                                                        <Grid>
                                                            <Grid.Row style={{paddingBottom: "0px"}}>
                                                                <Grid.Column verticalAlign={"middle"} textAlign={"center"} style={{paddingLeft: "30px", paddingRight: "30px"}}>
                                                                    <Input iconPosition={"left"} name={"email"} type={"email"} onChange={onChange} placeholder={"Enter your email"} style={{maxWidth: "100%"}} fluid>
                                                                        <Icon name={"at"} />
                                                                        <input />
                                                                    </Input>
                                                                </Grid.Column>
                                                            </Grid.Row>
                                                            <Grid.Row style={{paddingBottom: "0px"}}>
                                                                <Grid.Column verticalAlign={"middle"} textAlign={"center"}>
                                                                    <Button onClick={forgotPassword} animated={"vertical"} color={"blue"} loading={(loading)}>
                                                                        <Button.Content visible>
                                                                            Send reset code
                                                                        </Button.Content>
                                                                        <Button.Content hidden>
                                                                            <Icon name={"arrow right"} />
                                                                        </Button.Content>
                                                                    </Button>
                                                                </Grid.Column>
                                                            </Grid.Row>
                                                            <Grid.Row style={{paddingBottom: "0px", paddingTop: "0px"}}>
                                                                <Grid.Column verticalAlign={"middle"} textAlign={"left"}>
                                                                    <Button icon onClick={() => updateLoginState("signIn")} style={{backgroundColor: "transparent"}} size={"big"}>
                                                                        <Icon name={"left arrow"} /> Back
                                                                    </Button>
                                                                </Grid.Column>
                                                            </Grid.Row>
                                                        </Grid>
                                                    )
                                                }
                                                {
                                                    formType === "resetPassword" && (
                                                        <Grid>
                                                            <Grid.Row style={{paddingBottom: "0px"}}>
                                                                <Grid.Column verticalAlign={"middle"} textAlign={"center"} style={{paddingLeft: "30px", paddingRight: "30px"}}>
                                                                    <Input iconPosition={"left"} name={"email"} type={"email"} onChange={onChange} placeholder={"Enter your email"} style={{maxWidth: "100%"}} fluid>
                                                                        <Icon name={"at"} />
                                                                        <input />
                                                                    </Input>
                                                                </Grid.Column>
                                                            </Grid.Row>
                                                            <Grid.Row style={{paddingBottom: "0px"}}>
                                                                <Grid.Column verticalAlign={"middle"} textAlign={"center"} style={{paddingLeft: "30px", paddingRight: "30px"}}>
                                                                    <Input iconPosition={"left"} name={"resetCode"} onChange={onChange} placeholder={"Enter reset code"} style={{maxWidth: "100%"}} fluid>
                                                                        <Icon name={"unlock alternate"} />
                                                                        <input />
                                                                    </Input>
                                                                </Grid.Column>
                                                            </Grid.Row>
                                                            <Grid.Row style={{paddingBottom: "0px"}}>
                                                                <Grid.Column verticalAlign={"middle"} textAlign={"center"} style={{paddingLeft: "30px", paddingRight: "30px"}}>
                                                                    <Input iconPosition={"left"} name={"password"} type={"password"} onChange={onChange} placeholder={"Enter new password"} style={{maxWidth: "100%"}} fluid>
                                                                        <Icon name={"key"} />
                                                                        <input />
                                                                    </Input>
                                                                </Grid.Column>
                                                            </Grid.Row>
                                                            <Grid.Row style={{paddingBottom: "0px"}}>
                                                                <Grid.Column verticalAlign={"middle"} textAlign={"center"}>
                                                                    <Button onClick={resetPassword} animated={"vertical"} color={"blue"} loading={(loading)}>
                                                                        <Button.Content visible>
                                                                            Update Password
                                                                        </Button.Content>
                                                                        <Button.Content hidden>
                                                                            <Icon name={"arrow right"} />
                                                                        </Button.Content>
                                                                    </Button>
                                                                </Grid.Column>
                                                            </Grid.Row>
                                                            <Grid.Row style={{paddingBottom: "0px", paddingTop: "0px"}}>
                                                                <Grid.Column verticalAlign={"middle"} textAlign={"left"}>
                                                                    <Button icon onClick={() => updateLoginState("signIn")} style={{backgroundColor: "transparent"}} size={"big"}>
                                                                        <Icon name={"left arrow"} /> Back
                                                                    </Button>
                                                                </Grid.Column>
                                                            </Grid.Row>
                                                        </Grid>
                                                    )
                                                }
                                                {
                                                    formType === "signUp" && (
                                                        <Grid>
                                                            <Grid.Row style={{paddingBottom: "0px"}}>
                                                                <Grid.Column verticalAlign={"middle"} textAlign={"center"} style={{paddingLeft: "30px", paddingRight: "30px"}}>
                                                                    <Input iconPosition={"left"} name={"email"} type={"email"} onChange={onChange} placeholder={"Enter your email"} style={{maxWidth: "100%"}}
                                                                           error={(accountCreationError)} fluid>
                                                                        <Icon name={"at"} />
                                                                        <input />
                                                                    </Input>
                                                                    {(accountCreationError)? <span style={{color: "red"}}>An account with the given email already exists</span> : null}
                                                                </Grid.Column>
                                                            </Grid.Row>
                                                            <Grid.Row style={{paddingBottom: "0px"}}>
                                                                <Grid.Column verticalAlign={"middle"} textAlign={"center"} style={{paddingLeft: "30px", paddingRight: "30px"}}>
                                                                    <Input iconPosition={"left"} name={"password"} type={"password"} onChange={onChange} placeholder={"Enter a password"} style={{maxWidth: "100%"}} fluid>
                                                                        <Icon name={"key"} />
                                                                        <input />
                                                                    </Input>
                                                                </Grid.Column>
                                                            </Grid.Row>
                                                            <Grid.Row style={{paddingBottom: "0px"}}>
                                                                <Grid.Column verticalAlign={"middle"} textAlign={"center"}>
                                                                    <Button onClick={signUp} animated={"vertical"} color={"blue"} loading={(loading)}>
                                                                        <Button.Content visible>
                                                                            Register
                                                                        </Button.Content>
                                                                        <Button.Content hidden>
                                                                            <Icon name={"arrow right"} />
                                                                        </Button.Content>
                                                                    </Button>
                                                                </Grid.Column>
                                                            </Grid.Row>
                                                            <Grid.Row style={{paddingBottom: "0px", paddingTop: "0px"}}>
                                                                <Grid.Column verticalAlign={"middle"} textAlign={"left"}>
                                                                    <Button icon onClick={() => updateLoginState("signIn")} style={{backgroundColor: "transparent"}} size={"big"}>
                                                                        <Icon name={"left arrow"} /> Back
                                                                    </Button>
                                                                </Grid.Column>
                                                            </Grid.Row>
                                                        </Grid>
                                                    )
                                                }
                                                {
                                                    formType === "confirmSignUp" && (
                                                        <Grid>
                                                            <Grid.Row style={{paddingTop: "5px", paddingBottom: "0px"}}>
                                                                <Grid.Column verticalAlign={"middle"} textAlign={"center"} >
                                                                    <span>Please check your email for a confirmation code. This may take several minutes.</span>
                                                                </Grid.Column>
                                                            </Grid.Row>
                                                            <Grid.Row style={{paddingBottom: "0px"}}>
                                                                <Grid.Column verticalAlign={"middle"} textAlign={"center"} style={{paddingLeft: "30px", paddingRight: "30px"}}>
                                                                    {(verificationError)? <span style={{color: "red"}}><strong>Invalid verification code provided, please try again.</strong></span> : null}
                                                                    {(newVerification)? <span style={{color: "green"}}><strong>New verification code sent successfully.</strong></span> : null}
                                                                    <Input name={"authCode"} onChange={onChange} placeholder={"Enter your confirmation code."} style={{maxWidth: "100%"}}
                                                                          error={(verificationError)} fluid />
                                                                </Grid.Column>
                                                            </Grid.Row>
                                                            <Grid.Row style={{paddingBottom: "0px"}}>
                                                                <Grid.Column verticalAlign={"middle"} textAlign={"center"}>
                                                                    <Button onClick={confirmSignUp} animated={"vertical"} color={"blue"} loading={(loading)}>
                                                                        <Button.Content visible>
                                                                            Verify
                                                                        </Button.Content>
                                                                        <Button.Content hidden>
                                                                            <Icon name={"arrow right"} />
                                                                        </Button.Content>
                                                                    </Button>
                                                                </Grid.Column>
                                                            </Grid.Row>
                                                            <Grid.Row style={{paddingBottom: "0px"}}>
                                                                <Grid.Column verticalAlign={"middle"} textAlign={"center"}>
                                                                    <span>Didn't receive your verification code?</span>
                                                                    <Button style={{backgroundColor: "transparent"}} onClick={resendConfirmationCode}>Resend Code</Button>
                                                                </Grid.Column>
                                                            </Grid.Row>
                                                            <Grid.Row style={{paddingBottom: "0px", paddingTop: "0px"}}>
                                                                <Grid.Column verticalAlign={"middle"} textAlign={"left"}>
                                                                    <Button icon onClick={() => updateLoginState("signUp")} style={{backgroundColor: "transparent"}} size={"big"}>
                                                                        <Icon name={"left arrow"} /> Back
                                                                    </Button>
                                                                </Grid.Column>
                                                            </Grid.Row>
                                                        </Grid>
                                                    )
                                                }
                                            </Grid.Column>
                                        </Grid.Row>
                                    </Grid>
                                </div>
                            </Grid.Column>
                        </Grid.Row>
                    </Grid>
                </Grid.Column>
            </Grid.Row>
        </Grid>
    );
}

const mapStateToProps = (state) => {
    return {
        loginState: state.loginState.currentState,
    };
};

const mapDispatchToProps = {
    updateLoginState,
};


export default connect(mapStateToProps, mapDispatchToProps)(Login);
