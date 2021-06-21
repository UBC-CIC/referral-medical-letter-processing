import './App.css';
import React, {Component} from 'react';
import { connect } from "react-redux";
import { Grid } from 'semantic-ui-react'
import {Auth, Hub} from 'aws-amplify';
import S3Upload from "./Components/S3Upload/S3Upload";
import S3Table from "./Components/S3Table/S3Table";
import Navbar from "./Components/Navbar/Navbar";
import AppNotification from "./Components/Notifications/Notifications";
import Login from "./Components/Authentication/Login";
import {updateLoginState} from "./actions/loginActions";


class App extends Component {
  constructor(props){
    super(props);
    this.state = {username: "", currentLoginState: "signedOut"};

    this.componentDidMount = this.componentDidMount.bind(this);
  }

  async componentDidMount() {
      this.setAuthListener();
    try{
      const user = await Auth.currentAuthenticatedUser();
      this.setState({username: user.username});
    } catch (err) {
      console.log("ERROR : ", err);
    }
  }

    setAuthListener = async () => {
        const {updateLoginState} = this.props;
        Hub.listen('auth', (data)=> {
            switch(data.payload.event) {
                case "signOut":
                    updateLoginState("signIn");
                    break;
                default:
                    break;
            }
        })
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (this.props.loginState !== prevProps.loginState) {
            this.setState({
                currentLoginState: this.props.loginState,
            })
        }
    }

  render() {
    const {username} = this.state;
    const {notifications} = this.props;
    const notificationList = notifications.map(notification => {
        return (
            <AppNotification key={notification.id} id={notification.id} message={notification.message} type={notification.type} />
        )
    })
  return(
    <div className="App">
        {
            this.props.loginState !== "signedIn" && (
                <div  className="App" style={{height: "100vh", width: "100vw"}}>
                    <Login animateTitle={false} type={"image"} title={"Specialist Medical Centre"} darkMode={false} />
                </div>
            )
        }
        {
            this.props.loginState === "signedIn" && (
                <Grid>
                    <Navbar username={username} />
                    <Grid.Row>
                        <Grid.Column>
                            <br/>
                        </Grid.Column>
                    </Grid.Row>
                    <Grid.Row columns={3}>
                        <Grid.Column width={5}>
                            <S3Upload />
                        </Grid.Column>
                        <Grid.Column width={1} />
                        <Grid.Column width={10}>
                            <S3Table />
                        </Grid.Column>
                    </Grid.Row>
                    <Grid.Row>
                        <Grid.Column verticalAlign={"middle"} textAlign={"center"}>
                            {notificationList}
                        </Grid.Column>
                    </Grid.Row>
                </Grid>
            )
        }
        <br/>
        <br/>
    </div>
  )
}
}

const mapStateToProps = (state) => {
    return {
        notifications: state.notifications.alerts,
        loginState: state.loginState.currentState,
    };
};

const mapDispatchToProps = {
    updateLoginState,
}

export default connect(mapStateToProps, mapDispatchToProps)(App);

