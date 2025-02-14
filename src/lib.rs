use cosmwasm_std::{
    entry_point, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult,
    to_json_binary, StdError,
};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use cw_storage_plus::Item;
use thiserror::Error;

// Custom error type
#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")] // Pass through the underlying error
    Std(#[from] StdError),
    
    #[error("Unauthorized - only owner can update message")]
    Unauthorized {},
}

// State
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct State {
    pub message: String,
    pub owner: String,
}

// Store state in a singleton
pub const STATE: Item<State> = Item::new("state");

// Messages for contract instantiation
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct InstantiateMsg {
    pub message: String,
}

// Messages for contract execution
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum ExecuteMsg {
    UpdateMessage { message: String },
}

// Messages for contract queries
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    GetMessage {},
}

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> StdResult<Response> {
    let state = State {
        message: msg.message,
        owner: info.sender.to_string(),
    };
    STATE.save(deps.storage, &state)?;
    Ok(Response::new().add_attribute("action", "instantiate"))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::UpdateMessage { message } => execute_update_message(deps, info, message),
    }
}

pub fn execute_update_message(
    deps: DepsMut,
    info: MessageInfo,
    message: String,
) -> Result<Response, ContractError> {
    let mut state = STATE.load(deps.storage)?;
    
    // Only owner can update message
    if info.sender != state.owner {
        return Err(ContractError::Unauthorized {});
    }
    
    state.message = message;
    STATE.save(deps.storage, &state)?;
    
    Ok(Response::new().add_attribute("action", "update_message"))
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetMessage {} => to_json_binary(&query_message(deps)?),
    }
}

fn query_message(deps: Deps) -> StdResult<String> {
    let state = STATE.load(deps.storage)?;
    Ok(state.message)
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::{from_json, testing::{mock_dependencies, mock_env, mock_info}};

    #[test]
    fn proper_initialization() {
        let mut deps = mock_dependencies();
        let msg = InstantiateMsg {
            message: "hello".to_string(),
        };
        let info = mock_info("creator", &[]);
        let env = mock_env();

        // we can just call .unwrap() to assert this was a success
        let res = instantiate(deps.as_mut(), env, info, msg).unwrap();
        assert_eq!(0, res.messages.len());

        // Query the message
        let res = query(deps.as_ref(), mock_env(), QueryMsg::GetMessage {}).unwrap();
        let value: String = from_json(&res).unwrap();
        assert_eq!("hello", value);
    }

    #[test]
    fn update_message() {
        let mut deps = mock_dependencies();
        
        // Instantiate the contract
        let msg = InstantiateMsg {
            message: "hello".to_string(),
        };
        let info = mock_info("creator", &[]);
        let env = mock_env();
        instantiate(deps.as_mut(), env.clone(), info.clone(), msg).unwrap();

        // Update message
        let msg = ExecuteMsg::UpdateMessage {
            message: "world".to_string(),
        };
        let res = execute(deps.as_mut(), env.clone(), info, msg).unwrap();
        assert_eq!(1, res.attributes.len());

        // Query the message
        let res = query(deps.as_ref(), env, QueryMsg::GetMessage {}).unwrap();
        let value: String = from_json(&res).unwrap();
        assert_eq!("world", value);
    }

    #[test]
    fn unauthorized_update() {
        let mut deps = mock_dependencies();
        
        // Instantiate the contract
        let msg = InstantiateMsg {
            message: "hello".to_string(),
        };
        let creator_info = mock_info("creator", &[]);
        let env = mock_env();
        instantiate(deps.as_mut(), env.clone(), creator_info, msg).unwrap();

        // Attempt unauthorized update
        let msg = ExecuteMsg::UpdateMessage {
            message: "world".to_string(),
        };
        let unauthorized_info = mock_info("anyone", &[]);
        let err = execute(deps.as_mut(), env, unauthorized_info, msg).unwrap_err();
        assert_eq!(err.to_string(), "Unauthorized - only owner can update message");
    }
}
